# Plan de ejecución por fases
 
Cada fase es independiente y termina en un estado funcional/testeable. No avanzar de fase sin marcar los checks.
 
## Fase 0 — Setup del repo
- [x] `npx hardhat init` (TypeScript template)
- [x] Instalar OZ v5.5.x, wagmi, viem, @tanstack/react-query (versiones fijas, sin `^`) — instalado OZ 5.6.1 (compatible)
- [x] Estructura de carpetas: `/contracts`, `/scripts`, `/test`, `/frontend`, `/docs`
- [x] Gestión de secretos: **Hardhat 3 keystore** (`npx hardhat keystore set <VAR>`) en vez de `.env`/`.env.example` (obsoleto, retirado 2026-07-07 — ver `04_STATUS.md`)
## Fase 1 — Smart contract core — **CERRADA (2026-07-06)**
- [x] Escribir `Crowdfunding.sol` según `02_SMART_CONTRACT_SPEC.md`
- [x] Compilar sin errores — `npm run compile` OK; único output es un warning genérico de OZ sobre transient storage, evaluado y confirmado seguro (ver `04_STATUS.md`)
- [x] Tests unitarios: crear proyecto, pledge exitoso, pledge tras deadline (debe revertir), claim exitoso, claim sin éxito (debe revertir), refund individual — `test/Crowdfunding.ts`, **17/17 pasando**
- [x] Asserts de gas incluidos en los tests (`<350k` crear, `<120k` pledge) — pasan; reporte legible de `test:gas` queda como pendiente menor no bloqueante
## Fase 2 — Seguridad y edge cases — **CERRADA (2026-07-07)**
- [x] Test de reentrancy (mock de atacante) — `contracts/mocks/ReentrancyAttacker.sol` + `test/ReentrancyAttack.ts`, cubre `refund` y `claimFunds`
- [x] Test de fuzzing básico en montos (`goal = 0`, `durationSeconds = 0`) — cubierto en Fase 1 (`InvalidGoal`/`InvalidDuration`) + `test/PledgeFuzz.ts` (fuzz de `msg.value`, bordes de `uint96`, borde exacto de `deadline`)
- [x] Revisión manual checklist de `02_SMART_CONTRACT_SPEC.md` — ver `05_CRITICAL_REVIEW.md` § "Revisión manual — Fase 2"
- [x] Slither — ejecutado el 2026-07-07 (instalado vía pip en el entorno de análisis). 19 hallazgos en 6 detectores, ninguno crítico ni accionable (ruido de librería OZ o patrones ya justificados). Ver tabla completa en `05_CRITICAL_REVIEW.md` § "Slither — ejecutado (2026-07-07)". No se modificó código a raíz de esto.
## Fase 3 — Deploy en L2 testnet — **Deploy en Sepolia (L1) hecho; deploy real en Base Sepolia (L2, objetivo real) pendiente por fondos**
- [x] Script de deploy (`scripts/deploy.ts`) parametrizado por red — usa Hardhat Ignition (`ignition/modules/Crowdfunding.ts`) via `hre.network.create()` + `connection.ignition.deploy(...)`; escribe la direccion desplegada en `deployments/<network>.json`
- [x] Config de verificación agregada a `hardhat.config.ts` (`verify.etherscan.apiKey`, Basescan/Etherscan V2)
- [x] `.gitignore` corregido: ya no ignora `ignition/deployments/` (Hardhat recomienda versionarlo)
- [x] Soporte añadido para Ethereum Sepolia (L1 testnet) vía nodo Infura en `hardhat.config.ts` (red `sepolia`, `chainType: "l1"`) — a pedido de Abraham, como red testnet adicional a Base Sepolia. Reutiliza `DEPLOYER_PRIVATE_KEY` y `BASESCAN_API_KEY` (Etherscan V2 es multichain); nueva variable `SEPOLIA_RPC_URL` añadida a `.env.example`. `scripts/deploy.ts` no necesitó cambios: ya es agnóstico a la red vía `hre.network.create()` + `--network`.
- [x] Deploy real en Ethereum Sepolia (L1) ejecutado por Abraham (2026-07-07) con `scripts/deploy.ts --network sepolia` — dirección en `deployments/sepolia.json`. Nota: no es la red objetivo de la arquitectura (`01_ARCHITECTURE.md` asume L2), se usó como alternativa porque Base Sepolia aún no tenía fondos de testnet.
- [ ] Deploy real en Base Sepolia — sigue pendiente, **requiere que Abraham lo corra él mismo** cuando tenga ETH de testnet en esa red, con `npx hardhat run scripts/deploy.ts --network baseSepolia`.
- [ ] Verificar contrato en el explorador de bloques (Etherscan para el deploy de Sepolia ya hecho, Basescan cuando se despliegue en Base Sepolia) — pendiente de que Abraham corra `npx hardhat verify`.
## Fase 4 — Frontend base — **CERRADA (2026-07-08)**
- [x] Setup React + TS + Vite + shadcn/ui + Wagmi + Viem + WagmiProvider + QueryClientProvider — `/frontend`, package.json con versiones fijas (React 19.2.7, wagmi 3.6.17, viem 2.54.1, @tanstack/react-query 5.101.2, vite 8.1.3)
- [x] Conexión de wallet (MetaMask / EIP-6963) — `connectors: [injected()]` en `src/wagmi.ts`, componente `ConnectWallet.tsx` con selector de red (Base Sepolia / Sepolia)
- [x] Listado de proyectos — `useProjects` (`src/hooks/useProjects.ts`) lee `nextProjectId` y hace batch de `getProject` con `useReadContracts` (multicall), sin depender de logs de eventos
- [x] Detalle de un proyecto individual — `ProjectDetail.tsx`, lectura directa con `useReadContract(getProject)`
## Fase 5 — Frontend acciones — **CERRADA (2026-07-08)**
- [x] Formulario crear proyecto (incluye subida a IPFS del metadata antes de llamar al contrato) — `CreateProjectForm.tsx` + `usePinataUpload.ts`
- [x] Boton "pledge" con `useWriteContract` — `PledgeForm.tsx` + `usePledge.ts`
- [x] Boton "claim" (visible solo al creador si aplica) — `ProjectDetail.tsx` + `useClaimFunds.ts`
- [x] Boton "refund" (visible solo si el proyecto fallo y el usuario tiene pledge) — `ProjectDetail.tsx` + `useRefund.ts`
- [x] Manejo de estados de transaccion (pending/confirming/success/error) con mensajes legibles para no-tecnicos — `useTxStatus.ts` + `TransactionStatus.tsx`
- **Riesgo documentado (RESUELTO 2026-07-10):** `VITE_PINATA_JWT` ya no existe en el frontend. Se creo `/backend` (Express minimo) que es el unico que conoce el JWT de Pinata; el frontend le habla a el via `VITE_BACKEND_URL`. Ver `05_CRITICAL_REVIEW.md` y `04_STATUS.md` § Backend Pinata.
- [x] Documento adjunto (PDF/texto) opcional en "Crear proyecto", subido a IPFS junto a imagen/metadata — `CreateProjectForm.tsx` + `usePinataUpload.ts` (`documentCID`), ver `04_STATUS.md` § "Mejora Fase 5 (2026-07-08)". Validacion de tipo (`application/pdf`/`text/plain`) y tamano (10 MB) en el cliente.
- [x] `ProjectDetail.tsx` muestra/enlaza el `documentCID` en la vista de detalle — link "view attached document" via `documentUrl` (`useProjectMetadata`), agregado en la sesion "Fix (2026-07-16)" (`04_STATUS.md`). Confirmado contra el codigo real y cerrado en `09_ROADMAP_MEJORAS.md` § 6 (2026-07-20).
## Fase 6 — Deploy final y documentación
- [ ] Deploy en mainnet de la L2 elegida
- [ ] `README.md` para usuario final (cómo conectar wallet, crear proyecto, aportar, reclamar/reembolso)
- [ ] Documentación técnica final (arquitectura, decisiones, cómo correr el proyecto localmente)
- [ ] Actualizar `04_STATUS.md`
## Fase 7 (futuro, NO ahora) — Crecimiento
- Fees de plataforma, multi-token (ERC-20 además de nativo), gobernanza, sistema de reputación de creadores, indexador (The Graph) para no depender solo de eventos on-chain.

## Roadmap de mejoras post-review (transversal, no reemplaza estas fases)
Ver `09_ROADMAP_MEJORAS.md`: 8 puntos identificados en la evaluación del proyecto del 2026-07-19 (CI, tests de componentes/TxTracker, deploy Base Sepolia, backend persistente, etc.), cada uno con opciones para que Abraham decida — no compite con el orden de fases de este documento, se ejecuta bajo demanda como `06_FRONTEND_VISUAL_UPGRADE.md`.

## Mejora visual del frontend (transversal, no es una fase más en esta lista)
Ver `06_FRONTEND_VISUAL_UPGRADE.md`: mapa de referencia para agentes IA con animaciones/hovers/glow/elevación y el stack recomendado (GSAP, tokens de diseño, etc.). Se activa bajo demanda de Abraham sobre componentes ya existentes de Fase 4/5, no bloquea ni reordena Fases 3/6.

**Pendiente planificado (2026-07-10, no ejecutado):** Hero de landing con 3 carruseles infinitos (§9 de `06_FRONTEND_VISUAL_UPGRADE.md`). Introduce, a pedido explícito de Abraham, la adopción de **Tailwind CSS v4 + shadcn/ui** (hasta ahora fuera del stack) — única excepción deliberada al criterio de "no agregar dependencias sin necesidad técnica real" que guía el resto de este plan, justificada por motivo de aprendizaje. Detalle en `04_STATUS.md` y `06_FRONTEND_VISUAL_UPGRADE.md` §9.

## Nota de arquitectura (2026-07-17): migracion de frontend a TanStack Start
`frontend/` (Vite SPA) fue reemplazado por `frontend2.0/` (TanStack Start,
SSR + routing por archivos) como frontend oficial del repo. Motivo: mejor
mantenimiento a futuro si la dApp crece (routing por archivos en vez de un
unico `useState` de vistas, SSR para la landing publica). Ninguna fase de
este plan cambia de alcance por esto: es un cambio de contenedor/routing, no
de logica de negocio (contrato, IPFS, tracking de tx se migraron 1:1). Detalle
tecnico completo: `docs/08_FRONTEND_MIGRATION.md`.

**Actualizacion (2026-07-18):** la carpeta `frontend/` (Vite SPA vieja) fue
eliminada del repo. Ya no existe ni como referencia historica en disco. La
dApp funcional tampoco vive en una ruta separada (`/app`) dentro de
`frontend2.0/`: se embebio como seccion `#demo` de la landing (`/`). Ver
`docs/08_FRONTEND_MIGRATION.md` § "Sesion 2026-07-18".

## Nota de corrección (Fase 1, 2026-07-05)
El stack de testing real de este repo es **Hardhat 3 + `node:test` + viem + `hardhat-viem-assertions`**, no "Hardhat + Chai" como asumía este plan originalmente. Ver detalle en `01_ARCHITECTURE.md`. Estado detallado y próximos pasos siempre en `04_STATUS.md`.
