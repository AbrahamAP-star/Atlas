# Plan de ejecución por fases
 
Cada fase es independiente y termina en un estado funcional/testeable. No avanzar de fase sin marcar los checks.
 
## Fase 0 — Setup del repo
- [x] `npx hardhat init` (TypeScript template)
- [x] Instalar OZ v5.5.x, wagmi, viem, @tanstack/react-query (versiones fijas, sin `^`) — instalado OZ 5.6.1 (compatible)
- [x] Estructura de carpetas: `/contracts`, `/scripts`, `/test`, `/frontend`, `/docs`
- [x] `.env.example` con placeholders (RPC L2, private key deploy, WalletConnect ID)
## Fase 1 — Smart contract core
- [x] Escribir `Crowdfunding.sol` según `02_SMART_CONTRACT_SPEC.md`
- [ ] Compilar sin warnings — pendiente ejecutar `npm run compile` en máquina del usuario
- [x] Tests unitarios: crear proyecto, pledge exitoso, pledge tras deadline (debe revertir), claim exitoso, claim sin éxito (debe revertir), refund individual — escritos en `test/Crowdfunding.ts`, pendiente correr
- [ ] `hardhat-gas-reporter` verificando límites 350k / 120k gas — asserts de gas ya incluidos en los tests (`test:gas`), pendiente ejecutar y confirmar cifras reales
## Fase 2 — Seguridad y edge cases
- [ ] Test de reentrancy (mock de atacante)
- [x] Test de fuzzing básico en montos (`goal = 0`, `durationSeconds = 0`) — cubierto como validación explícita en Fase 1 (`InvalidGoal`/`InvalidDuration`), falta test de `pledge` con `msg.value` fuzz
- [ ] Revisión manual checklist de `02_SMART_CONTRACT_SPEC.md`
- [ ] (Opcional pero recomendado) correr Slither o el analizador estático disponible
## Fase 3 — Deploy en L2 testnet
- [ ] Script de deploy (`scripts/deploy.ts`) parametrizado por red
- [ ] Deploy en testnet de Base (Base Sepolia)
- [ ] Verificar contrato en el explorador de bloques
## Fase 4 — Frontend base
- [ ] Setup React + TS + Wagmi + Viem + WagmiProvider + QueryClientProvider
- [ ] Conexión de wallet (MetaMask / EIP-6963)
- [ ] Listado de proyectos (`useReadContract` / lectura del mapping vía evento `ProjectCreated` + `getProject`)
- [ ] Detalle de un proyecto individual
## Fase 5 — Frontend acciones
- [ ] Formulario crear proyecto (incluye subida a IPFS del metadata antes de llamar al contrato)
- [ ] Botón "pledge" con `useWriteContract`
- [ ] Botón "claim" (visible solo al creador si aplica)
- [ ] Botón "refund" (visible solo si el proyecto falló y el usuario tiene pledge)
- [ ] Manejo de estados de transacción (pending/success/error) con mensajes legibles para no-técnicos
## Fase 6 — Deploy final y documentación
- [ ] Deploy en mainnet de la L2 elegida
- [ ] `README.md` para usuario final (cómo conectar wallet, crear proyecto, aportar, reclamar/reembolso)
- [ ] Documentación técnica final (arquitectura, decisiones, cómo correr el proyecto localmente)
- [ ] Actualizar `04_STATUS.md`
## Fase 7 (futuro, NO ahora) — Crecimiento
- Fees de plataforma, multi-token (ERC-20 además de nativo), gobernanza, sistema de reputación de creadores, indexador (The Graph) para no depender solo de eventos on-chain.

## Nota de corrección (Fase 1, 2026-07-05)
El stack de testing real de este repo es **Hardhat 3 + `node:test` + viem + `hardhat-viem-assertions`**, no "Hardhat + Chai" como asumía este plan originalmente. Ver detalle en `01_ARCHITECTURE.md`. Estado detallado y próximos pasos siempre en `04_STATUS.md`.
