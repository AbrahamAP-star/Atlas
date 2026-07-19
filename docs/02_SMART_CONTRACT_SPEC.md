# Smart Contract Spec — Crowdfunding.sol
 
## Modelo de datos (tipos ajustados al mínimo necesario)
```solidity
struct Project {
    address payable creator;   // 20 bytes
    uint96 goal;                // wei del monto MINIMO que habilita el retiro (ya no es "objetivo con deadline")
    uint96 pledged;             // total recaudado, se actualiza tambien en refund
    bool claimed;                // si el creador ya retiró (retiro = cierre del proyecto)
    string metadataCID;          // referencia a IPFS (descripcion, imagen)
}
```
> **Cambio de modelo (2026-07-09):** se eliminó `deadline`/duración. Un proyecto no
> tiene fecha de cierre: sigue aceptando pledges indefinidamente, incluso después de
> alcanzar `goal`. El creador puede llamar a `claimFunds` en cualquier momento una vez
> alcanzada la meta — a su propia discreción, no hay cierre automático. El proyecto
> solo deja de aceptar pledges cuando el creador finalmente reclama (`claimed == true`),
> o cuando el propio creador lo borra (`deleteProject`, agregado 2026-07-16 — ver
> `05_CRITICAL_REVIEW.md` § "deleteProject").
> Ver `05_CRITICAL_REVIEW.md` § "Cambio de modelo: fin del deadline" para el detalle
> completo de por qué se hizo y sus implicancias de seguridad.
> Nota: `goal`/`pledged` en `uint96` asume montos en wei razonables para un crowdfunding pequeño-mediano. Si el cliente prevé campañas de cientos de miles de ETH (poco realista), subir a `uint128`. Este es exactamente el tipo de "variable interna" que el equipo puede ajustar sin tocar lógica.
 
## Storage
- `mapping(uint256 => Project) public projects` — id incremental (`uint32` alcanza y sobra para número de proyectos).
- `mapping(uint256 => mapping(address => uint96)) public pledges` — cuánto aportó cada wallet a cada proyecto (necesario para reembolso individual).
## Funciones — orden de lectura (según requisito del cliente: lectura/vista primero, cambios de estado al final)
 
### Vistas (no modifican estado)
- `getProject(uint256 id) external view returns (Project memory)`
- `pledgeOf(uint256 id, address backer) external view returns (uint96)`
- `isSuccessful(uint256 id) external view returns (bool)` — `pledged >= goal`
- ~~`isExpired`~~ — eliminada, ya no existe deadline.
### Cambios de estado (al final del archivo)
- `createProject(uint96 goal, string memory metadataCID) external returns (uint256 id)`
  - Presupuesto: **< 350,000 gas**. Un solo `SSTORE` de struct + push a mapping + evento. Ya no recibe `durationSeconds`.
- `pledge(uint256 id) external payable nonReentrant`
  - Presupuesto: **< 120,000 gas**. Actualiza `pledges` y `Project.pledged`. Ya no expira nunca; solo revierte si el proyecto ya fue reclamado (`ProjectClosed`).
- `claimFunds(uint256 id) external nonReentrant`
  - Solo `creator`, solo si `isSuccessful && !claimed`. Sin chequeo de expiración: el creador reclama cuando el mismo decide, en cualquier momento después de alcanzar la meta. Patrón pull: transfiere el total al creador.
- `refund(uint256 id) external nonReentrant`
  - Cualquier backer, en cualquier momento, solo si `!claimed`. Ya no depende de `isSuccessful`: es la única vía de salida para un backer que se arrepiente antes de que el creador reclame. Descuenta también de `Project.pledged` (no solo de `pledges[id][backer]`), porque el proyecto puede seguir vivo después del refund. Devuelve su propio pledge (evita el problema clásico de "un solo backer bloquea el refund de todos" al hacerlo individual, no en loop).
- `deleteProject(uint256 id) external` **(agregado 2026-07-16)**
  - Solo `creator`. Solo si `pledged == 0 || claimed`: no se permite si hay pledges sin reclamar, para no dejar a esos backers sin forma de recuperar su aporte. Usa `delete projects[id]` (libera gas, `creator` vuelve a `address(0)`). `pledge` trata `creator == address(0)` como proyecto cerrado (`ProjectClosed`). Justificación completa en `05_CRITICAL_REVIEW.md` § "deleteProject".
## Por qué el contrato nunca queda bloqueado
- No existe ninguna ruta de fondos sin salida: mientras no se reclamó, cualquier backer puede pedir `refund` en cualquier momento; una vez alcanzada la meta, el creador puede `claimFunds` cuando decida. No hay `onlyOwner` que pueda pausar retiros de forma permanente (evita "rug pull" del propio dev, que es justo lo que el cliente pidió evitar).
- No se usa un loop sobre todos los backers para nada (evita DoS por gas si la lista crece).
## Eventos (uno por acción relevante, requisito del cliente)
```solidity
event ProjectCreated(uint256 indexed id, address indexed creator, uint96 goal);
event Pledged(uint256 indexed id, address indexed backer, uint96 amount);
event FundsClaimed(uint256 indexed id, uint96 amount);
event Refunded(uint256 indexed id, address indexed backer, uint96 amount);
event ProjectDeleted(uint256 indexed id);
```
 
## Seguridad — checklist
- [x] Checks-Effects-Interactions en `pledge`, `claimFunds`, `refund`
- [x] `nonReentrant` (OZ v5.5 `ReentrancyGuard`, stateless) como segunda capa
- [x] Sin `transfer`/`send` (evita límite 2300 gas de EIP-1884) — usar `call` + patrón pull + `require(success)`
- [x] Sin loops sobre estructuras de tamaño no acotado
- [x] ~~`deadline` validado contra `block.timestamp` en creación~~ — ya no aplica, no hay deadline.
- [ ] Pendiente decidir: ¿fee de plataforma? No pedido por el cliente — no se implementa para no añadir complejidad ni superficie de ataque extra.

## Implementado en Fase 1 (2026-07-05) — `contracts/Crowdfunding.sol`
Esta spec quedó incompleta en varios puntos que se detectaron escribiendo el contrato real; documentados también en `05_CRITICAL_REVIEW.md`:

- **`ReentrancyGuardTransient`** en vez de `ReentrancyGuard` clásico (ver justificación en `01_ARCHITECTURE.md`) — mismo modifier `nonReentrant`, drop-in.
- **`SafeCast`** en toda conversión `uint256 → uint96`/`uint40` (`msg.value.toUint96()`, cálculo de `deadline`). Sin esto, un valor que excede el rango se truncaba en silencio en vez de revertir.
- **Validaciones nuevas, no explícitas en esta spec original:**
  - `goal > 0` (`InvalidGoal`) — con `goal == 0` el proyecto sería "exitoso" (`pledged >= goal`) sin haber recibido fondos.
  - `msg.value > 0` en `pledge` (`ZeroPledge`) — evita ruido de eventos sin aporte real.
  - Existencia de `id` (`ProjectNotFound`) en `getProject`, `isSuccessful`, `pledge`, `claimFunds`, `refund` — un `id` inexistente devolvía un struct en cero, y `0 >= 0` hacía que `isSuccessful` diera `true` para proyectos que nunca existieron.
  - **(2026-07-09) `durationSeconds`/`InvalidDuration` eliminados** junto con todo el concepto de deadline, ver `05_CRITICAL_REVIEW.md`. `pledge` ahora solo rechaza con `ProjectClosed` si el proyecto ya fue reclamado.
- **Errores personalizados (`error X()`)** en vez de `require(string)` en toda la spec — más baratos en gas, relevante para 350k/120k.
- `metadataCID` recibido como `calldata` (no `memory`) en `createProject`: al ser un string externo que solo se guarda, evita la copia extra a memoria.

Detalle completo del código, tests y estado: ver `04_STATUS.md`.
