# Status

Fecha última actualización: 2026-07-05

Fase actual: **Fase 1 — Smart contract core** (implementada, pendiente de compilar/testear en la máquina del usuario)

## Hecho
- Documentación inicial: overview, arquitectura, spec de contrato, plan de fases.
- Fase 0 (setup del repo): ya estaba hecha al iniciar Fase 1 — Hardhat 3 + toolbox-viem + OZ 5.6.1 instalados, estructura de carpetas creada.
- Fase 1: `contracts/Crowdfunding.sol` escrito según `02_SMART_CONTRACT_SPEC.md`, con correcciones de seguridad (ver `05_CRITICAL_REVIEW.md`).
- Fase 1: `test/Crowdfunding.ts` escrito (node:test + viem + hardhat-viem-assertions, no Chai/Mocha — ver corrección en `01_ARCHITECTURE.md`), cubre: createProject (éxito + goal=0 + duration=0), pledge (éxito + acumulación + value=0 + expirado + id inexistente), claimFunds (éxito + no-creador + no-exitoso + no-expirado + doble claim) y refund (éxito + proyecto exitoso + sin fondos + no-expirado). Incluye asserts de gas (<350k crear, <120k pledge).

## Siguiente paso inmediato
Ejecutar en la máquina del usuario (Claude no puede correr shell ahí, solo leer/escribir archivos):
```
npm run compile
npm run test:gas
```
Revisar el reporte de gas real contra los límites 350k/120k y pasarle a Claude cualquier error de compilación o test para corregir.

## Decisiones ya tomadas (no reabrir sin razón)
- L2 objetivo: Base
- OZ v5.6.1 instalado (spec pedía 5.5.x; compatible, misma ubicación `/utils/ReentrancyGuard.sol`)
- **`ReentrancyGuardTransient`** (no el `ReentrancyGuard` clásico) — usa TSTORE/TLOAD (EIP-1153), más barato en gas, crítico para el límite de 120k de `pledge`. Requiere red con soporte Cancún (Base/Arbitrum/Optimism lo tienen).
- Testing: **Hardhat 3 + `node:test` + viem + `hardhat-viem-assertions`** (NO Chai/Mocha — el `package.json` real usa `@nomicfoundation/hardhat-toolbox-viem`, distinto de lo asumido en la doc original de arquitectura).
- Errores personalizados (`error X()`) en vez de `require(string)` — más baratos en gas.
- Sin fee de plataforma en v1
- Sin loops sobre backers (refund individual)
- Tipos de storage: `uint96` goal/pledged, `uint40` deadline, `uint32` nextProjectId
- Validaciones añadidas en Fase 1 (no estaban explícitas en la spec original): `goal > 0`, `durationSeconds > 0`, `msg.value > 0` en pledge, existencia de `id` en toda función que lo reciba, `SafeCast` en toda conversión `uint256 → uintN`.

## Riesgos abiertos
- Confirmar si el cliente quiere aportes solo en moneda nativa (ETH) o también ERC-20 (impacta `pledge`/`refund`). Asumido: solo nativo en v1.
- Confirmar proveedor de pinning IPFS (Pinata vs web3.storage) antes de Fase 5.
- Pendiente: correr `npm run compile` y `npm run test:gas` en la máquina real para confirmar que el contrato compila sin warnings y que los gastos de gas estimados manualmente (createProject ~130-150k, pledge ~70-75k) coinciden con la medición real.
- Pendiente Fase 2 (no iniciada): test de reentrancy con mock atacante, fuzzing de `goal=0`/`durationSeconds=0` (parcialmente ya cubierto como validación explícita en Fase 1), revisión manual de checklist de seguridad, Slither opcional.
