# Architecture — Justificación técnica
 
## 1. Smart contract layer
- **Solidity ^0.8.24**, Hardhat como entorno de dev/test/deploy.
- **OpenZeppelin Contracts v5.5.x**. Desde v5.5, `ReentrancyGuard` es *stateless* y vive en `@openzeppelin/contracts/utils/ReentrancyGuard.sol` (ya NO en `/security/`, esa ruta está deprecada en versiones recientes). Si el proyecto usa contratos upgradeables, `ReentrancyGuardUpgradeable` fue removido en 5.5 — usar la variante no-upgradeable y, si se necesita proxy, inicializar manualmente el slot (`_reentrancyGuardStorageSlot`).
- Patrón recomendado por el propio equipo de OZ: **checks-effects-interactions** + `nonReentrant` como defensa en profundidad, no como sustituto.
- No usar `Escrow.sol` / `PullPayment.sol` de OZ tal cual: están pensados para pagos genéricos, no para lógica de metas de crowdfunding (¿qué pasa si no se llega a la meta?). Se construye un contrato propio de crowdfunding que **internamente** usa el patrón *pull-payment* (mapping de saldos + retiro por el propio usuario) en vez de `transfer`/`send` directos, evitando reentrancy y el límite de 2300 gas de EIP-1884.
## 2. Frontend layer
Stack confirmado como el estándar actual del ecosistema (no deprecado):
- **Wagmi v2** (paquete `wagmi`, última versión estable en npm ronda 3.6.x) — capa de hooks React.
- **Viem** — cliente TypeScript de bajo nivel sobre el que corre Wagmi; reemplazo moderno de ethers.js, más liviano y con mejor tipado.
- **TanStack Query** — cache y estado async, requerido por Wagmi v2.
- **TypeScript** en todo el frontend.
- Conectores: MetaMask vía EIP-6963 (auto-discovery), WalletConnect opcional para fase futura.
Nota de mantenimiento (fuente: comparativas de la comunidad, ver abajo): Wagmi ha cambiado de API entre v1 y v2 varias veces; **fijar versiones exactas en package.json** (no usar `^`) para evitar romper el proyecto en un futuro upgrade no planeado.
 
## 3. Capa L2 (deploy)
Elección: **Base** (rollup optimista sobre Ethereum, EVM-equivalente, gas muy bajo, buena adopción de wallets/tooling). Alternativas EVM-equivalentes válidas con el mismo código: Arbitrum, Optimism. Los límites de gas del cliente (350k / 120k) son cómodos en cualquiera de estas L2 pero **ajustados si algún día se quisiera deployar también en L1 mainnet** — el diseño de gas se hace pensando en el peor caso (L1) para que sea portable.
 
## 4. IPFS
Metadata pesada de cada campaña (imagen, descripción larga, documentos) NO va on-chain (rompería el presupuesto de gas). Se sube a IPFS off-chain (Pinata/web3.storage) y solo el **CID (bytes32/string)** se guarda en el contrato. El contrato es la fuente de verdad de fondos; IPFS es solo presentación.
 
## 5. Testing
Hardhat + Chai + `hardhat-gas-reporter` para verificar en cada test que `createProject` y `pledge` no superan 350k/120k gas — esto convierte las restricciones del cliente en un test automatizado, no en una promesa.
 
## Fuentes consultadas
- wagmi.sh — Getting Started / Installation / Viem guide (docs oficiales, vigentes)
- npmjs.com/package/wagmi — versión publicada actual
- github.com/OpenZeppelin/openzeppelin-contracts — CHANGELOG.md y código fuente `ReentrancyGuard.sol` / `ReentrancyGuardTransient.sol`
- docs.openzeppelin.com/contracts — Security y Utils (Escrow, PullPayment)
- forum.openzeppelin.com — hilos sobre remoción de `ReentrancyGuardUpgradeable` en v5.5
- PkgPulse, Startupik — comparativas comunitarias wagmi vs viem vs ethers.js (2026)

## Corrección — Fase 1 (2026-07-05)
El punto 5 de este documento quedó desactualizado en cuanto se ejecutó Fase 0. Correcciones confirmadas leyendo directamente `hardhat.config.ts`, `package.json` y `node_modules` del repo:

- **Testing real: Hardhat 3 + `node:test` + viem + `hardhat-viem-assertions`**, NO Mocha/Chai. El `package.json` instala `@nomicfoundation/hardhat-toolbox-viem` (el toolbox recomendado por Nomic Foundation para proyectos nuevos en HH3), que trae el runner nativo de Node (`node:test`) en vez de Mocha. Fuente: hardhat.org/docs/guides/testing/using-viem y hardhat.org/docs/plugins/hardhat-toolbox-viem (ambas, julio 2026). El gas reporting se hace corriendo `REPORT_GAS=true hardhat test` (ya está en el script `test:gas` del `package.json`), y además se añadieron asserts de gas explícitos dentro de los tests (`receipt.gasUsed <= 350_000n` / `<= 120_000n`) para que el límite falle el test automáticamente, no solo aparezca en un reporte que alguien debe leer.
- **OZ instalado: v5.6.1** (spec pedía 5.5.x). Compatible: se confirmó leyendo `node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol` que la ruta sigue siendo `/utils/` como se documentó aquí, no `/security/`.
- **Decisión añadida en Fase 1: se usa `ReentrancyGuardTransient` (no `ReentrancyGuard` clásico)**. Usa transient storage (TSTORE/TLOAD, EIP-1153) en vez de storage normal (SSTORE/SLOAD) para el lock de reentrancy, ahorrando ~2500-5000 gas por llamada — relevante porque `pledge` tiene un presupuesto duro de 120k gas. Requiere que la red de destino soporte Cancún/EIP-1153; Base, Arbitrum y Optimism ya lo soportan en 2026. Fuente: `node_modules/@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol` (OZ 5.6.1, mismo modifier `nonReentrant`, drop-in compatible con el resto de la spec).

Estado detallado, avances y próximos pasos: ver siempre `04_STATUS.md` (es la fuente de verdad del progreso, este archivo solo documenta justificación técnica).
