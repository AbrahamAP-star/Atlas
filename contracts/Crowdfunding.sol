// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/**
 * @title Crowdfunding
 * @notice Plataforma de financiación descentralizada. Custodia los fondos on-chain:
 *         si un proyecto alcanza su meta antes del deadline, el creador puede reclamar
 *         el total recaudado; si no la alcanza, cada aportante puede reembolsarse
 *         individualmente. No existe ninguna función de administrador que pueda
 *         bloquear alguno de estos dos caminos de salida (ver 05_CRITICAL_REVIEW.md).
 * @dev Patrón pull-payment: nunca se envía ETH de forma "push" con loops sobre backers.
 *      Cada usuario retira lo que le corresponde llamando él mismo a claimFunds/refund.
 *
 *      Se usa ReentrancyGuardTransient (storage transient / EIP-1153) en vez de
 *      ReentrancyGuard clásico: el lock usa TSTORE/TLOAD en vez de SSTORE/SLOAD,
 *      lo que ahorra ~2500-5000 gas por llamada. Esto importa porque `pledge` tiene
 *      un presupuesto duro de 120,000 gas. Requiere una red con soporte de Cancún/
 *      EIP-1153 (Base, Arbitrum y Optimism ya lo soportan en 2026).
 *      Fuente: OpenZeppelin Contracts v5.6.1, utils/ReentrancyGuardTransient.sol.
 */
contract Crowdfunding is ReentrancyGuardTransient {
    using SafeCast for uint256;

    // ---------------------------------------------------------------------
    // Tipos y storage
    // ---------------------------------------------------------------------

    /// @dev Orden de campos pensado para packing: slot0 = creator+goal (32 bytes
    ///      exactos), slot1 = pledged+deadline+claimed (18/32 bytes). metadataCID
    ///      es dinámico y usa sus propios slots. No reordenar sin recalcular esto.
    struct Project {
        address payable creator; // 20 bytes ┐ slot 0
        uint96 goal;              // 12 bytes ┘ (32 bytes exactos)
        uint96 pledged;           // 12 bytes ┐
        uint40 deadline;          //  5 bytes │ slot 1
        bool claimed;              //  1 byte  ┘
        string metadataCID;       // slot(s) dinámicos — referencia a IPFS
    }

    /// @notice Id que se asignará al próximo proyecto creado. También funciona como
    ///         límite superior para validar que un id existe (id < nextProjectId).
    uint32 public nextProjectId;

    /// @notice Datos de cada proyecto, indexados por id incremental.
    mapping(uint256 id => Project project) public projects;

    /// @notice Cuánto aportó cada wallet a cada proyecto (necesario para refund individual).
    mapping(uint256 id => mapping(address backer => uint96 amount)) public pledges;

    // ---------------------------------------------------------------------
    // Eventos (uno por acción relevante, requisito del cliente)
    // ---------------------------------------------------------------------

    event ProjectCreated(uint256 indexed id, address indexed creator, uint96 goal, uint40 deadline);
    event Pledged(uint256 indexed id, address indexed backer, uint96 amount);
    event FundsClaimed(uint256 indexed id, uint96 amount);
    event Refunded(uint256 indexed id, address indexed backer, uint96 amount);

    // ---------------------------------------------------------------------
    // Errores personalizados
    // ---------------------------------------------------------------------
    // Se usan custom errors en vez de require(string) porque cuestan menos gas
    // (no se codifica ni almacena el string del mensaje) — relevante para los
    // límites de 350k/120k gas de este contrato.

    error InvalidGoal();
    error InvalidDuration();
    error ProjectNotFound(uint256 id);
    error ProjectExpired(uint256 id);
    error ProjectNotExpired(uint256 id);
    error ZeroPledge();
    error ProjectNotSuccessful(uint256 id);
    error ProjectWasSuccessful(uint256 id);
    error AlreadyClaimed(uint256 id);
    error NotProjectCreator(uint256 id);
    error NoFundsToRefund(uint256 id);
    error TransferFailed();

    // ---------------------------------------------------------------------
    // Vistas (no modifican estado)
    // ---------------------------------------------------------------------

    /// @notice Devuelve los datos completos de un proyecto.
    function getProject(uint256 id) external view returns (Project memory) {
        _requireProjectExists(id);
        return projects[id];
    }

    /// @notice Cuánto aportó `backer` al proyecto `id`.
    function pledgeOf(uint256 id, address backer) external view returns (uint96) {
        return pledges[id][backer];
    }

    /// @notice `true` si el proyecto alcanzó (o superó) su meta.
    function isSuccessful(uint256 id) external view returns (bool) {
        _requireProjectExists(id);
        return _isSuccessful(id);
    }

    /// @notice `true` si ya pasó el deadline del proyecto.
    function isExpired(uint256 id) external view returns (bool) {
        _requireProjectExists(id);
        return _isExpired(id);
    }

    // ---------------------------------------------------------------------
    // Internas de validación/lectura (evitan duplicar lógica y checks)
    // ---------------------------------------------------------------------

    function _requireProjectExists(uint256 id) internal view {
        if (id >= nextProjectId) revert ProjectNotFound(id);
    }

    function _isSuccessful(uint256 id) internal view returns (bool) {
        return projects[id].pledged >= projects[id].goal;
    }

    function _isExpired(uint256 id) internal view returns (bool) {
        return block.timestamp > projects[id].deadline;
    }

    // ---------------------------------------------------------------------
    // Cambios de estado (al final del archivo, convención de legibilidad del
    // equipo — no aporta seguridad por sí sola, ver 05_CRITICAL_REVIEW.md).
    // ---------------------------------------------------------------------

    /**
     * @notice Crea un proyecto de crowdfunding.
     * @param goal Meta a recaudar, en wei. Debe ser mayor a 0.
     * @param durationSeconds Duración de la campaña desde ahora, en segundos. Debe ser mayor a 0.
     * @param metadataCID CID de IPFS con la metadata (descripción, imagen).
     * @return id Id incremental asignado al proyecto.
     *
     * @dev `metadataCID` usa `calldata` en vez de `memory`: al ser un string que llega
     *      desde fuera y solo se guarda (nunca se modifica dentro de la función),
     *      calldata evita la copia extra a memoria y abarata el gas de esta función.
     *      goal==0 y durationSeconds==0 se rechazan explícitamente: un proyecto con
     *      goal=0 sería "exitoso" (pledged >= goal) sin haber recibido ni un wei,
     *      lo cual rompe la semántica de claim/refund.
     */
    function createProject(
        uint96 goal,
        uint40 durationSeconds,
        string calldata metadataCID
    ) external returns (uint256 id) {
        if (goal == 0) revert InvalidGoal();
        if (durationSeconds == 0) revert InvalidDuration();

        uint40 deadline = (block.timestamp + durationSeconds).toUint40();

        id = nextProjectId;
        nextProjectId++; // checked por defecto en Solidity 0.8+, revierte si desborda uint32

        projects[id] = Project({
            creator: payable(msg.sender),
            goal: goal,
            pledged: 0,
            deadline: deadline,
            claimed: false,
            metadataCID: metadataCID
        });

        emit ProjectCreated(id, msg.sender, goal, deadline);
    }

    /**
     * @notice Aporta ETH nativo a un proyecto existente.
     * @dev Checks-Effects-Interactions: no hay ninguna llamada externa en esta función
     *      (no envía ETH), pero se mantiene `nonReentrant` como defensa en profundidad
     *      y por consistencia con el resto de funciones de cambio de estado.
     *      Se rechaza msg.value == 0: un pledge de 0 no aporta nada, solo generaría
     *      ruido de eventos/logs sin motivo (ver recomendación en 05_CRITICAL_REVIEW.md).
     */
    function pledge(uint256 id) external payable nonReentrant {
        _requireProjectExists(id);
        if (msg.value == 0) revert ZeroPledge();
        if (_isExpired(id)) revert ProjectExpired(id);

        uint96 amount = msg.value.toUint96(); // revierte si msg.value > type(uint96).max, no trunca en silencio

        pledges[id][msg.sender] += amount; // suma checked: revierte si desborda uint96
        projects[id].pledged += amount;

        emit Pledged(id, msg.sender, amount);
    }

    /**
     * @notice El creador retira el total recaudado si el proyecto tuvo éxito.
     * @dev Effects (claimed = true) antes de la interaction (call), siguiendo CEI.
     */
    function claimFunds(uint256 id) external nonReentrant {
        _requireProjectExists(id);
        Project storage project = projects[id];

        if (msg.sender != project.creator) revert NotProjectCreator(id);
        if (!_isExpired(id)) revert ProjectNotExpired(id);
        if (!_isSuccessful(id)) revert ProjectNotSuccessful(id);
        if (project.claimed) revert AlreadyClaimed(id);

        uint96 amount = project.pledged;

        project.claimed = true; // effect antes de la interaction

        (bool success, ) = project.creator.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FundsClaimed(id, amount);
    }

    /**
     * @notice Cualquier backer recupera su propio aporte si el proyecto no tuvo éxito.
     * @dev Reembolso individual (sin loop sobre todos los backers): evita que un
     *      backer bloquee el refund de los demás y evita DoS por gas si la lista
     *      de backers crece (ver 02_SMART_CONTRACT_SPEC.md).
     */
    function refund(uint256 id) external nonReentrant {
        _requireProjectExists(id);
        if (!_isExpired(id)) revert ProjectNotExpired(id);
        if (_isSuccessful(id)) revert ProjectWasSuccessful(id);

        uint96 amount = pledges[id][msg.sender];
        if (amount == 0) revert NoFundsToRefund(id);

        pledges[id][msg.sender] = 0; // effect antes de la interaction

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Refunded(id, msg.sender, amount);
    }
}
