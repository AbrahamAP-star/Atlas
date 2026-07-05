# Smart Contract Spec — Crowdfunding.sol
 
## Modelo de datos (tipos ajustados al mínimo necesario)
```solidity
struct Project {
    address payable creator;   // 20 bytes
    uint96 goal;                // wei del objetivo — uint96 cubre hasta ~79 billones de wei-ETH, sobra
    uint96 pledged;             // total recaudado
    uint40 deadline;            // timestamp unix — uint40 cubre hasta el año 36812, sobra vs uint256
    bool claimed;                // si el creador ya retiró
    string metadataCID;          // referencia a IPFS (descripcion, imagen)
}
```
> Nota: `goal`/`pledged` en `uint96` asume montos en wei razonables para un crowdfunding pequeño-mediano. Si el cliente prevé campañas de cientos de miles de ETH (poco realista), subir a `uint128`. Este es exactamente el tipo de "variable interna" que el equipo puede ajustar sin tocar lógica.
 
## Storage
- `mapping(uint256 => Project) public projects` — id incremental (`uint32` alcanza y sobra para número de proyectos).
- `mapping(uint256 => mapping(address => uint96)) public pledges` — cuánto aportó cada wallet a cada proyecto (necesario para reembolso individual).
## Funciones — orden de lectura (según requisito del cliente: lectura/vista primero, cambios de estado al final)
 
### Vistas (no modifican estado)
- `getProject(uint256 id) external view returns (Project memory)`
- `pledgeOf(uint256 id, address backer) external view returns (uint96)`
- `isSuccessful(uint256 id) external view returns (bool)` — `pledged >= goal`
- `isExpired(uint256 id) external view returns (bool)` — `block.timestamp > deadline`
### Cambios de estado (al final del archivo)
- `createProject(uint96 goal, uint40 durationSeconds, string memory metadataCID) external returns (uint256 id)`
  - Presupuesto: **< 350,000 gas**. Un solo `SSTORE` de struct + push a mapping + evento.
- `pledge(uint256 id) external payable nonReentrant`
  - Presupuesto: **< 120,000 gas**. Actualiza `pledges` y `Project.pledged`. Ya expira si `block.timestamp > deadline` (revert).
- `claimFunds(uint256 id) external nonReentrant`
  - Solo `creator`, solo si `isSuccessful && isExpired && !claimed`. Patrón pull: transfiere el total al creador.
- `refund(uint256 id) external nonReentrant`
  - Cualquier backer, solo si `isExpired && !isSuccessful`. Devuelve su propio pledge (evita el problema clásico de "un solo backer bloquea el refund de todos" al hacerlo individual, no en loop).
## Por qué el contrato nunca queda bloqueado
- No existe ninguna ruta de fondos sin salida: si tiene éxito → `claimFunds`; si falla → `refund` individual. No hay `onlyOwner` que pueda pausar retiros de forma permanente (evita "rug pull" del propio dev, que es justo lo que el cliente pidió evitar).
- No se usa un loop sobre todos los backers para nada (evita DoS por gas si la lista crece).
## Eventos (uno por acción relevante, requisito del cliente)
```solidity
event ProjectCreated(uint256 indexed id, address indexed creator, uint96 goal, uint40 deadline);
event Pledged(uint256 indexed id, address indexed backer, uint96 amount);
event FundsClaimed(uint256 indexed id, uint96 amount);
event Refunded(uint256 indexed id, address indexed backer, uint96 amount);
```
 
## Seguridad — checklist
- [x] Checks-Effects-Interactions en `pledge`, `claimFunds`, `refund`
- [x] `nonReentrant` (OZ v5.5 `ReentrancyGuard`, stateless) como segunda capa
- [x] Sin `transfer`/`send` (evita límite 2300 gas de EIP-1884) — usar `call` + patrón pull + `require(success)`
- [x] Sin loops sobre estructuras de tamaño no acotado
- [x] `deadline` validado contra `block.timestamp` en creación (evitar crear proyectos ya vencidos)
- [ ] Pendiente decidir: ¿fee de plataforma? No pedido por el cliente — no se implementa para no añadir complejidad ni superficie de ataque extra.

## Implementado en Fase 1 (2026-07-05) — `contracts/Crowdfunding.sol`
Esta spec quedó incompleta en varios puntos que se detectaron escribiendo el contrato real; documentados también en `05_CRITICAL_REVIEW.md`:

- **`ReentrancyGuardTransient`** en vez de `ReentrancyGuard` clásico (ver justificación en `01_ARCHITECTURE.md`) — mismo modifier `nonReentrant`, drop-in.
- **`SafeCast`** en toda conversión `uint256 → uint96`/`uint40` (`msg.value.toUint96()`, cálculo de `deadline`). Sin esto, un valor que excede el rango se truncaba en silencio en vez de revertir.
- **Validaciones nuevas, no explícitas en esta spec original:**
  - `goal > 0` (`InvalidGoal`) — con `goal == 0` el proyecto sería "exitoso" (`pledged >= goal`) sin haber recibido fondos.
  - `durationSeconds > 0` (`InvalidDuration`).
  - `msg.value > 0` en `pledge` (`ZeroPledge`) — evita ruido de eventos sin aporte real.
  - Existencia de `id` (`ProjectNotFound`) en `getProject`, `isSuccessful`, `isExpired`, `pledge`, `claimFunds`, `refund` — un `id` inexistente devolvía un struct en cero, y `0 >= 0` hacía que `isSuccessful` diera `true` para proyectos que nunca existieron.
- **Errores personalizados (`error X()`)** en vez de `require(string)` en toda la spec — más baratos en gas, relevante para 350k/120k.
- `metadataCID` recibido como `calldata` (no `memory`) en `createProject`: al ser un string externo que solo se guarda, evita la copia extra a memoria.

Detalle completo del código, tests y estado: ver `04_STATUS.md`.
