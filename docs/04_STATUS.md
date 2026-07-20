# Status

Fecha última actualización: 2026-07-19 (ver "Sesion 2026-07-19 (3): CI (GitHub Actions)" para el detalle mas reciente)

**Roadmap de mejoras pendientes (post-review 2026-07-19):** ver `09_ROADMAP_MEJORAS.md` — 8 puntos priorizados con opciones para decidir, no acciones ya ejecutadas.

Fase actual: **Fase 5 — CERRADA (frontend acciones). Fase 3 sigue con un pendiente real: deploy en Base Sepolia (L2, objetivo de la arquitectura) bloqueado por falta de fondos de testnet** — el deploy que sí se ejecutó fue en Ethereum Sepolia (L1), ver detalle abajo.

## Hecho
- Documentación inicial: overview, arquitectura, spec de contrato, plan de fases.
- Fase 0 (setup del repo): ya estaba hecha al iniciar Fase 1 — Hardhat 3 + toolbox-viem + OZ 5.6.1 instalados, estructura de carpetas creada.
- Fase 1: `contracts/Crowdfunding.sol` escrito según `02_SMART_CONTRACT_SPEC.md`, con correcciones de seguridad (ver `05_CRITICAL_REVIEW.md`).
- Fase 1: `test/Crowdfunding.ts` escrito (node:test + viem + hardhat-viem-assertions, no Chai/Mocha — ver corrección en `01_ARCHITECTURE.md`), cubre: createProject (éxito + goal=0 + duration=0), pledge (éxito + acumulación + value=0 + expirado + id inexistente), claimFunds (éxito + no-creador + no-exitoso + no-expirado + doble claim) y refund (éxito + proyecto exitoso + sin fondos + no-expirado). Incluye asserts de gas (<350k crear, <120k pledge).

## Cierre de Fase 1 (2026-07-06)
- `npm run compile`: compila OK. Único output: warning genérico de OZ sobre `TransientSlot`/EIP-1153 (no error). Evaluado y confirmado seguro — ver "Decisión: warning de transient storage" abajo.
- `npx hardhat test`: **17/17 tests pasando**.
- Pendiente real (no bloqueante para cerrar Fase 1): correr `test:gas` para tener la cifra exacta de gas de `createProject`/`pledge` en un reporte; los tests ya incluyen asserts que revientan si se supera 350k/120k, así que el límite duro ya está garantizado aunque falte el reporte legible.

## Decisión: warning de transient storage (EIP-1153) — evaluado y APROBADO, sin cambios de código
Warning recibido en `npm run compile`:
> "transient storage... your contract may unintentionally misbehave when invoked multiple times... The use of transient storage for reentrancy guards that are cleared at the end of the call is safe."

Este es un warning **genérico** que el compilador emite siempre que se importa `TransientSlot.sol`, sin analizar si tu uso concreto es seguro. Se auditó manualmente contra el código real:
- `node_modules/@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol` (OZ 5.6.1): el modifier `nonReentrant` hace `tstore(true)` en `_nonReentrantBefore` y **siempre** `tstore(false)` en `_nonReentrantAfter`, ejecutado después de `_;` (el cuerpo de la función), en cada llamada — nunca deja el lock "pegado".
- Por EIP-1153, un `revert` deshace los cambios de transient storage del mismo call frame igual que a `storage` normal — si `pledge`/`claimFunds`/`refund` revierten, el `tstore(true)` también se revierte, no queda basura entre llamadas.
- En `Crowdfunding.sol` ninguna función `nonReentrant` llama a otra función `nonReentrant` del mismo contrato (no hay anidamiento), y las únicas llamadas externas (`.call{value}`) van a una wallet externa (creator/backer), no reentran al propio contrato antes de que el guard se limpie.
- Conclusión: el caso de riesgo real que advierte el warning (un lock que persiste entre múltiples invocaciones separadas dentro de la misma transacción porque nunca se limpia) **no aplica aquí** — es exactamente el patrón que el propio mensaje de OZ describe como seguro ("reentrancy guards that are cleared at the end of the call"). Se descarta cambiar a `memory` (no existe tal cosa para un lock cross-call; `memory` se borra entre llamadas externas distintas y no serviría como guard) y se descarta volver a `ReentrancyGuard` clásico (SSTORE/SLOAD) porque perdería el ahorro de gas (~2500-5000 gas) crítico para el límite de 120k de `pledge`, sin ganar seguridad real.
- Fuente: código fuente citado arriba (`@openzeppelin/contracts` v5.6.1) + texto del propio warning del compilador Solidity 0.8.24 para `TransientSlot.sol`.

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
- Pendiente (no bloqueante): correr `npm run test:gas` para tener el reporte legible de gas real de `createProject`/`pledge` (los asserts de gas en los tests ya garantizan el límite duro 350k/120k aunque falte el reporte).
- Pendiente Fase 2 (no iniciada): test de reentrancy con mock atacante, fuzzing de `goal=0`/`durationSeconds=0` (parcialmente ya cubierto como validación explícita en Fase 1), revisión manual de checklist de seguridad, Slither opcional.

## Cierre de Fase 2 (2026-07-07) — Slither
- Se instaló `slither-analyzer` (vía pip) y se corrió contra `contracts/Crowdfunding.sol` + `contracts/mocks/ReentrancyAttacker.sol` (compilado con OZ 5.6.1 real).
- Resultado: **19 hallazgos en 6 detectores, ninguno crítico ni accionable** — son ruido de librería OZ (assembly interno, pragma mixto en `SafeCast.sol`) o patrones ya documentados y aceptados (`block.timestamp` para deadlines, `.call{value}` en vez de `transfer`). Detalle completo y tabla en `05_CRITICAL_REVIEW.md` § "Slither — ejecutado (2026-07-07)".
- **No se modificó `Crowdfunding.sol`** a raíz de este análisis: no había nada que corregir.
- Con esto, el único pendiente que quedaba abierto de Fase 2 en `03_PLAN_FASES.md` (Slither, marcado antes como opcional/no disponible) queda resuelto. **Fase 2 pasa a CERRADA.**

## Fase 3 (2026-07-07) — preparado, deploy real pendiente
Se preparó toda la infraestructura de deploy, pero el deploy efectivo a Base Sepolia **no se ejecutó desde aquí**: este asistente no tiene acceso a la red RPC de Base Sepolia ni a una private key de deployer (y no debería tenerla). Lo que sí se dejó listo:

- **`ignition/modules/Crowdfunding.ts`**: módulo de Hardhat Ignition que declara el deploy de `Crowdfunding` (sin argumentos de constructor). Se eligió Ignition en vez de un script imperativo a mano porque ya viene incluido en `hardhat-toolbox-viem` (sin instalar nada nuevo) y da deploys idempotentes (no redeploya si ya existe) + reintentos/gas bumping automatico ante transacciones atascadas — relevante en un RPC público de testnet. Fuente: hardhat.org/docs/tutorial/deploying y hardhat.org/ignition/docs/guides/scripts (julio 2026).
- **`scripts/deploy.ts`**: script que llama a `hre.network.create()` + `connection.ignition.deploy(CrowdfundingModule)`, imprime la direccion desplegada, y la guarda en `deployments/<network>.json` para que el frontend (Fase 4/5) tenga un solo lugar de donde leer la direccion del contrato en vez de hardcodearla.
- **`hardhat.config.ts`**: se agregó el bloque `verify.etherscan.apiKey` (usa `configVariable("BASESCAN_API_KEY")`, cargada via Hardhat keystore) para poder correr `npx hardhat verify` después del deploy. Basescan usa la API multichain de Etherscan V2, la misma key sirve para Base y Base Sepolia.
- **`.gitignore`**: se corrigió un hueco — ignoraba `ignition/deployments/` por completo, pero Hardhat recomienda explícitamente versionar esa carpeta (contiene el registro de qué se desplogó y con qué argumentos, necesario para reproducir/verificar después). Se cambió a **no** ignorarla, con un comentario explicando por qué.

### Comandos que Abraham debe correr en WSL para cerrar Fase 3 (con sus propias credenciales)
```bash
# 1. Configurar secretos (una sola vez, quedan cifrados via Hardhat keystore):
npx hardhat keystore set BASE_SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set BASESCAN_API_KEY

# 2. Deploy a Base Sepolia:
npx hardhat run scripts/deploy.ts --network baseSepolia

# 3. Verificar en Basescan (usar la direccion que imprimio el paso 2):
npx hardhat verify --network baseSepolia <DIRECCION_DEL_CONTRATO>
```
Una vez Abraham confirme output limpio de estos 3 pasos (direccion desplegada + verificacion exitosa en el explorador) **en Base Sepolia especificamente**, Fase 3 queda cerrada del todo. El deploy en Sepolia (ver seccion siguiente) no cierra este pendiente: es un deploy real, pero en L1, no en la L2 que pide la arquitectura.

## Confirmado por Abraham (2026-07-08): deploy real ejecutado, pero en Sepolia (L1), no Base Sepolia
Abraham corrio `npx hardhat run scripts/deploy.ts --network sepolia` con sus propias credenciales (RPC + private key via keystore). Resultado:

- **Direccion desplegada:** `0xE97E780c58eDbc4f9519522E24cBc0d6968cf67b` (ver `deployments/sepolia.json` e `ignition/deployments/chain-11155111/deployed_addresses.json`).
- **`npm test` sigue en verde** despues del deploy (Abraham lo confirmo), es decir, el deploy no rompio nada del set de tests de Fase 1/2.
- **Motivo del cambio de red:** Abraham no tenia fondos de testnet suficientes en Base Sepolia al momento de correr el deploy. Existe un intento previo en `ignition/deployments/chain-84532/` (id de Base Sepolia) sin `deployed_addresses.json`, consistente con un deploy que no llego a confirmarse por falta de gas.
- **Por que esto importa (no es solo un detalle cosmetico):** toda la arquitectura de este proyecto (`01_ARCHITECTURE.md` §3, `00_PROJECT_OVERVIEW.md`) esta pensada para una L2 (Base): los limites de gas 350k/120k se calcularon para ser comodos en L2 y ajustados-pero-viables en el peor caso L1, y `ReentrancyGuardTransient` requiere Cancun/EIP-1153, que Sepolia si soporta desde su propio upgrade de Cancun, asi que ahi no hay riesgo de incompatibilidad. El riesgo real es de **costo**: el mismo `pledge`/`createProject` que cuesta centavos en Base Sepolia cuesta gas real (aunque sea testnet ETH) en Ethereum Sepolia, y si Fase 6 (mainnet) terminara deployando en Ethereum L1 en vez de Base por inercia, el costo por transaccion para los usuarios finales seria ordenes de magnitud mayor a lo prometido en la propuesta original al cliente.
- **No se requiere ninguna accion correctiva sobre el contrato**: `Crowdfunding.sol` es identico en ambas redes (mismo bytecode), esto es puramente una decision de a que red se apunta, no un bug de codigo.
- **Pendiente real que se mantiene abierto:** el deploy a Base Sepolia sigue sin hacerse. Cuando Abraham tenga fondos, correr los mismos 3 comandos de arriba cambiando `--network sepolia` por `--network baseSepolia`.

## Soporte añadido: Ethereum Sepolia via Infura (2026-07-07)
A pedido de Abraham se añadió una red testnet adicional a `hardhat.config.ts`, usable con `--network sepolia`:

- **Red `sepolia`**: `type: "http"`, `chainType: "l1"` (no `"op"`: Sepolia es la testnet de Ethereum L1, no una L2 OP Stack — a diferencia de `baseSepolia`/`base`). `chainType` incorrecto aquí habría sido un bug silencioso (Hardhat 3 sí valida el tipo de chain contra el runtime EDR/viem asociado).
- **`url: configVariable("SEPOLIA_RPC_URL")`**: nueva variable, pensada para un endpoint de Infura (`https://sepolia.infura.io/v3/<PROJECT_ID>`), pero acepta cualquier RPC HTTP compatible (Alchemy, público, etc.) sin cambiar código. Se guarda con `npx hardhat keystore set SEPOLIA_RPC_URL` (no hay `.env.example`: ver nota de retiro más abajo).
- **Reutiliza `DEPLOYER_PRIVATE_KEY` y `BASESCAN_API_KEY`**: misma cuenta de deploy para todas las redes; Basescan/Etherscan V2 es multichain, así que la misma API key verifica contratos en Sepolia sin necesitar una key distinta.
- **`scripts/deploy.ts` no requirió cambios**: ya lee la red activa vía `hre.network.create()` + el flag `--network`, es agnóstico a cuál red se use.
- **`ignition/modules/Crowdfunding.ts`** tampoco requirió cambios: no tiene argumentos de constructor ni lógica condicional por red.

### Comandos para deploy de prueba en Sepolia (opcional, mismo patrón que Base Sepolia)
```bash
npx hardhat keystore set SEPOLIA_RPC_URL
# (DEPLOYER_PRIVATE_KEY y BASESCAN_API_KEY ya deberían estar en el keystore si se configuró Base Sepolia)

npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat verify --network sepolia <DIRECCION_DEL_CONTRATO>
```

**Nota crítica:** Sepolia es L1, no L2 — los límites de gas de 350k/120k (calculados para el peor caso L1, ver `01_ARCHITECTURE.md` §3) siguen siendo válidos aquí, pero el costo real en ETH de gas será mucho mayor que en Base Sepolia. Usar Sepolia solo para pruebas de compatibilidad L1 (ej. si en el futuro se evalúa deploy en Ethereum mainnet), no como red principal de testing — Base Sepolia sigue siendo la red de referencia del proyecto.

## Retiro de `.env.example` (2026-07-07)
El proyecto ya no usa `.env`/dotenv en ningún punto: toda variable (RPC URLs, `DEPLOYER_PRIVATE_KEY`, `BASESCAN_API_KEY`) se guarda cifrada vía Hardhat 3 keystore (`npx hardhat keystore set <VAR>`), como ya se venía haciendo desde Fase 3. `.env.example` quedó obsoleto y se vació con una nota de deprecación; Abraham puede borrarlo (`rm .env.example`) ya que la herramienta usada aquí no tiene permiso de borrado de archivos. Lista completa de variables a configurar en el keystore: `BASE_SEPOLIA_RPC_URL`, `BASE_MAINNET_RPC_URL`, `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `BASESCAN_API_KEY` (y `PINATA_JWT` en Fase 5).

## Cierre de Fase 4 (2026-07-08) — Frontend base
Se creo `/frontend` como paquete independiente (propio `package.json`), separado del Hardhat/Solidity de la raiz:

- **Stack instalado con versiones exactas** (sin `^`/`~`, mismo criterio que el resto del proyecto): `react`/`react-dom` 19.2.7, `wagmi` 3.6.17, `viem` 2.54.1 (misma version que ya fija el backend, evita divergencia de tipos entre ABI y llamadas), `@tanstack/react-query` 5.101.2, `vite` 8.1.3, `@vitejs/plugin-react` 6.0.3, `typescript` 6.0.3 (igual que la raiz). Versiones confirmadas contra el registro de npm el mismo dia, no asumidas de memoria.
- **`src/wagmi.ts`**: `createConfig` con `chains: [baseSepolia, sepolia]` (ambas testnets ya soportadas por el backend) y `connectors: [injected()]` — cubre MetaMask u otra wallet inyectada via EIP-6963 sin hardcodear un conector especifico. Base mainnet se agrega en Fase 6, no antes.
- **`src/contracts/crowdfundingAbi.ts`**: ABI copiado a mano desde `artifacts/contracts/Crowdfunding.sol/Crowdfunding.json` (fuente real post-compilacion, no reescrito de memoria). Se omitieron a proposito los getters publicos `projects`/`pledges` del ABI del frontend: son redundantes con `getProject`/`pledgeOf`, que ya devuelven la misma info con mejor forma (struct completo vs tupla suelta) — menos superficie de ABI que mantener en el frontend.
- **`src/contracts/crowdfundingConfig.ts`**: mapea `chainId → address` leyendo `import.meta.env.VITE_CROWDFUNDING_ADDRESS_*`. La direccion de Sepolia ya viene pre-cargada en `frontend/.env.example` (`0xE97E780c58eDbc4f9519522E24cBc0d6968cf67b`, el deploy real confirmado arriba); la de Base Sepolia queda vacia hasta que exista un deploy real ahi.
- **`src/hooks/useProjects.ts`**: `useProjects` (listado) lee `nextProjectId` y arma un batch de `getProject(0..n-1)` con `useReadContracts` (multicall automatico de wagmi/viem) en vez de indexar el evento `ProjectCreated` — mas simple para esta fase y sin necesitar un indexador; se documenta en `03_PLAN_FASES.md` Fase 7 que un indexador tipo The Graph es mejora futura si la cantidad de proyectos crece mucho. `useProject(id)` hace la lectura individual para la vista de detalle.
- **Componentes**: `ConnectWallet` (conectar/desconectar + selector de red), `ProjectList`/`ProjectCard` (grid con barra de progreso y estado derivado de `deadline`/`goal`/`pledged`, sin duplicar `isSuccessful`/`isExpired` on-chain), `ProjectDetail` (vista individual con link a metadata en IPFS via gateway publico `ipfs.io`, provisional hasta que Fase 5 defina el proveedor de pinning).
- **`App.tsx`**: cambio de vista listado/detalle con un simple `useState`, sin libreria de rutas — con 2 pantallas una libreria de routing seria complejidad injustificada; se reevalua si Fase 5/6 agregan mas pantallas.
- **Diseño**: paleta propia (tinta oscura `#14211f` + verde salvia `#4f7a68`/`#2f5a46`) definida en `src/styles.css`, sin dependencia de webfonts externas (tipografia de sistema) para no atar al cliente a un CDN de fuentes.
- **No incluido a proposito en esta fase** (es contenido de Fase 5, no de Fase 4): boton de crear proyecto, pledge, claim, refund, y el formulario/subida a IPFS. `ProjectDetail.tsx` tiene un comentario marcando donde se agregan.

### Pendiente para que Abraham pueda correr el frontend
```bash
cd frontend
npm install
cp .env.example .env   # ya trae la direccion de Sepolia; completar VITE_CROWDFUNDING_ADDRESS_BASE_SEPOLIA cuando exista ese deploy
npm run dev
```

## Cierre de Fase 5 (2026-07-08) — Frontend acciones
Autorizado por Abraham. Se agregaron las 4 acciones de escritura sobre `/frontend`, sin tocar `Crowdfunding.sol` ni el resto del backend:

- **Hooks de escritura** (`useCreateProject`, `usePledge`, `useClaimFunds`, `useRefund`): cada uno envuelve `useWriteContract` con `functionName` fijo (evita el `as any` que exigiria un dispatcher generico tipado dinamicamente) y comparte `useTxStatus` para derivar un estado uniforme `idle/pending/confirming/success/error`.
- **`useTxStatus.ts`**: traduce los custom errors reales del ABI (`InvalidGoal`, `ZeroPledge`, `NotProjectCreator`, `AlreadyClaimed`, `SafeCastOverflowedUintDowncast`, etc.) a mensajes en español para no-tecnicos, en vez de mostrar el revert crudo de Solidity.
- **`useProjectStatus.ts`**: batch (`useReadContracts`) de `isSuccessful`/`isExpired`/`pledgeOf(usuario actual)` — decide que botones mostrar sin duplicar esa logica en el frontend.
- **`usePinataUpload.ts`**: sube imagen (opcional, `pinFileToIPFS`) + JSON de metadata (`pinJSONToIPFS`) a Pinata via `fetch` directo (sin SDK nuevo), devuelve el CID final que se pasa a `createProject`.
- **`CreateProjectForm.tsx`**: formulario (titulo, descripcion, imagen opcional, meta en ETH, duracion en dias) que primero sube a IPFS y luego llama `createProject` con el CID resultante.
- **`ProjectDetail.tsx`**: ahora incluye `PledgeForm` (visible si el proyecto no vencio), boton "Reclamar fondos" (visible solo al creador si `isSuccessful && isExpired && !claimed`) y boton "Pedir reembolso" (visible si `isExpired && !isSuccessful && pledgeOf(usuario) > 0`) — coincide 1:1 con las condiciones de revert del contrato, no son heuristicas del frontend.
- **`TransactionStatus.tsx`**: banner reutilizable con el estado de cada tx y link al explorador correcto segun la red activa (`getExplorerTxUrl` en `crowdfundingConfig.ts`, Etherscan para Sepolia / Basescan para Base Sepolia).
- **`App.tsx`**: se agrego una tercera vista (`create`) ademas de `list`/`detail`, seguimos sin libreria de rutas (3 pantallas simples no lo justifican todavia).

### Hallazgo de seguridad documentado (no bloqueante, decision explicita)
Subir a IPFS desde el navegador requiere el JWT de Pinata en el bundle del frontend (`VITE_PINATA_JWT`), lo cual lo expone publicamente a cualquiera que inspeccione el JS servido — no hay backend propio en este proyecto para actuar de proxy y ocultarlo. Mitigacion aplicada: se documenta en `frontend/.env.example` y en `05_CRITICAL_REVIEW.md` que **debe usarse una API key de Pinata con scope restringido** (solo `pinFileToIPFS`/`pinJSONToIPFS`, sin permisos de administracion de la cuenta), nunca el JWT admin completo. Si a futuro se agrega un backend (fuera del alcance actual), la subida deberia moverse ahi.

### Pendiente para que Abraham pruebe Fase 5
```bash
cd frontend
# agregar VITE_PINATA_JWT a .env (API key con scope restringido a pinning, ver advertencia arriba)
npm run dev
```
Probar: crear proyecto (sube a IPFS + `createProject`), pledge, y — cuando haya un proyecto vencido en la red de prueba — claim/refund.

## Fix post-Fase 5 (2026-07-08): direccion undefined + gating de red
Bug reportado por Abraham: `npm run dev` mostraba "Esta red no tiene el contrato desplegado todavia" a pesar de que Sepolia si tiene deploy real. Causas encontradas (las 3 combinadas):

1. **Faltaba `frontend/.env`** (solo existia `.env.example`, nunca copiado) -> `VITE_CROWDFUNDING_ADDRESS_SEPOLIA` era `undefined` en runtime. Creado `frontend/.env` con la direccion real de Sepolia.
2. **`ConnectWallet.tsx` usaba la API de wagmi v2**, pero `package.json` tiene `wagmi@3.6.17` (v3): en v3 `useConnect`/`useDisconnect`/`useSwitchChain` devuelven objetos de mutacion (`connect.mutate(...)`, no `connect(...)` como funcion), y `connectors`/`chains` se movieron a `useConnectors()`/`useChains()`. Por eso el boton "Conectar wallet" no hacia nada (llamaba a un objeto como si fuera funcion). Corregido en `ConnectWallet.tsx`. Fuente: docs oficiales wagmi (`site/react/guides/migrate-from-v2-to-v3.md`, via Context7 `/wevm/wagmi`).
3. **`useChainId()` enmascara redes no soportadas**: si la wallet esta en una red no configurada en `wagmiConfig`, devuelve la ULTIMA red configurada en vez de la real (confirmado en docs de wagmi), haciendo imposible detectar "red no soportada". Se reemplazo por `useAccount().chainId` en toda la app.

**Arquitectura nueva de gating de red** (`src/hooks/useNetworkStatus.ts`, fuente unica de verdad, usado por `ProjectList`, `ProjectDetail`, `CreateProjectForm`, `ConnectWallet`, `App`):
- Sin wallet -> modo solo lectura sobre `defaultReadChainId` (primera red soportada con contrato desplegado), banner informativo "Por favor conecte su wallet", sin bloquear la navegacion.
- Wallet en red no configurada en `wagmiConfig` -> mensaje "red no soportada, cambiar a: {redes soportadas}".
- Wallet en red soportada sin deploy (Base Sepolia hoy) -> mensaje "contrato no desplegado en esta red, cambiar a: {redes con deploy}".
- Wallet en red soportada y desplegada -> interaccion completa (pledge/claim/refund/create habilitados).
- `crowdfundingConfig.ts` ahora deriva `supportedChains`/`deployedChains`/`defaultReadChainId` de `wagmiConfig.chains` (una sola fuente, evita que el array de redes se desincronice entre `wagmi.ts` y `crowdfundingConfig.ts`).

### Pendiente para Abraham
```bash
cd frontend
# agregar VITE_PINATA_JWT al .env ya creado (API key con scope restringido, ver advertencia en el archivo)
npm run dev
```

## Mejora Fase 5 (2026-07-08): documento adjunto (PDF/texto) en crear proyecto
A pedido de Abraham se agrego un tercer input de archivo en `CreateProjectForm.tsx`, debajo del label "Descripcion", siguiendo el mismo patron que ya existia para "Imagen" pero restringido a documentos (no imagenes):

- **`CreateProjectForm.tsx`**: boton "Seleccionar archivo" (un `<label htmlFor>` estilizado que activa un `<input type="file">` oculto con `.file-input-hidden` — oculto via clip/position, no `display:none`, para que siga siendo enfocable por teclado/lector de pantalla). Valida el `File.type` real contra una whitelist (`application/pdf`, `text/plain`) y un limite de 10 MB **en el cliente**, antes de subir nada — el atributo HTML `accept` por si solo no es una validacion real (solo filtra el selector del SO; un archivo arrastrado o renombrado lo evade), asi que la validacion de tipo/tamano se hizo en JS explicito.
- **`usePinataUpload.ts`**: `upload()` gano un 4to parametro opcional `document`; si viene, se sube a Pinata igual que la imagen (`pinFileToIPFS`) y su CID se agrega como `documentCID` en el JSON de metadata (`pinJSONToIPFS`), junto a `imageCID`.
- **`styles.css`**: clases nuevas `.file-input-hidden`, `.file-select-button`, `.file-selected-name`.
- **Sin cambios en el contrato**: el documento es puramente metadata off-chain, igual que la imagen — coherente con la decision ya tomada en `05_CRITICAL_REVIEW.md` de no subir contenido pesado on-chain.
- **Pendiente (no bloqueante):** `ProjectDetail.tsx` todavia no muestra/enlaza el `documentCID` en la vista de detalle — hoy el CID se guarda en IPFS pero no hay UI de lectura para el documento adjunto. Candidato a cerrar antes de considerar Fase 5 totalmente terminada de cara al usuario final.

## Fix (2026-07-10): ERR_CONNECTION_REFUSED en /api/auth/nonce

Abraham reporto `net::ERR_CONNECTION_REFUSED` en `useIpfsAuth.ts` al crear proyecto. Diagnostico:

- **Causa real:** el backend (`/backend`) no estaba corriendo — nada escuchaba en `:3001`, por eso el navegador rechazaba la conexion antes de llegar a Express. No era un bug del fetch en `useIpfsAuth.ts`.
- Al levantar `npm run dev` en `/backend`, salio el warning `PINATA_JWT no configurado`: `backend/.env` existe pero con `PINATA_JWT` vacio.
- **Fix aplicado en codigo:** `backend/src/pinata.ts` ahora corta con un error explicito (`"PINATA_JWT no configurado en backend/.env"`) antes de llamar a Pinata, en vez de dejar que Pinata devuelva un 401 generico dificil de diagnosticar desde el frontend. El flujo de auth (`/api/auth/nonce`, `/api/auth/verify`) no depende de Pinata y ya funciona sin la key; solo `/api/pin-file`/`/api/pin-json` la necesitan.
- **Pendiente para Abraham (no resoluble desde aqui, requiere su propia cuenta de Pinata):** completar `PINATA_JWT` en `backend/.env` con una API key de scope restringido (`pinFileToIPFS`/`pinJSONToIPFS`, sin permisos de administracion — ver `05_CRITICAL_REVIEW.md`). Sin esto, el nonce/firma funcionan pero la subida real a IPFS seguira fallando con el mensaje claro nuevo en vez de un 401 crudo.

## Fix (2026-07-10): "gas limit too high" (Infura) en createProject

Abraham reporto un revert de `createProject` con `RPC 0xaa36a7 Infura eth_sendRawTransaction: gas limit too high` y penso que era un fallo de IPFS. Diagnostico:

- **No es un problema de IPFS.** `handleSubmit` en `CreateProjectForm.tsx` solo llama a `createProject(...)` si `upload()` ya devolvio un CID valido; si la subida a Pinata hubiera fallado, la funcion corta antes (`if (!cid) return`) y nunca se envia ninguna transaccion. Que el error haya llegado hasta la etapa de RPC/gas confirma que el CID se subio bien.
- **Causa real:** ninguno de los hooks de escritura (`useCreateProject`, `usePledge`, `useClaimFunds`, `useRefund`) fijaba un `gas` explicito, asi que quedaba en manos de la wallet estimarlo (`eth_estimateGas`). Cuando esa estimacion falla del lado del RPC (visto con MetaMask + Infura en Sepolia), algunas versiones de MetaMask caen a un fallback de gas igual al gas limit del bloque (~30M), y el propio nodo de Infura rechaza enviar una transaccion con un gas limit tan alto ("gas limit too high") antes de intentar ejecutarla siquiera. Se descarto un bug de nuestro codigo forzando ese valor: se reviso `useCreateProject.ts` y el resto de hooks de escritura, ninguno seteaba `gas` manualmente antes de este fix; tampoco hay overrides de gas en `wagmi.ts`/`crowdfundingConfig.ts`.
- **Fix aplicado:** los 4 hooks de escritura (`useCreateProject`, `usePledge`, `useClaimFunds`, `useRefund`) ahora pasan un `gas` explicito en la llamada a `writeContract`, basado en los topes duros ya documentados en `00_PROJECT_OVERVIEW.md` (<350k crear, <120k pledge) mas margen: `createProject` -> `400_000n`, `pledge`/`claimFunds`/`refund` -> `200_000n`. Con un gas explicito, la wallet ya no necesita adivinar via `eth_estimateGas` y no puede caer al fallback gigante que Infura rechaza.
- **Si el error persiste** despues de este fix, ya no seria un problema de estimacion sino de la configuracion de red en la wallet: probar (1) que la cuenta tenga ETH de Sepolia suficiente para gas, (2) cambiar el RPC de Sepolia configurado en MetaMask (Infura free tier a veces rate-limita `eth_estimateGas`) por uno publico alternativo, o (3) actualizar MetaMask a la ultima version.

## Hero de landing + carruseles infinitos — CERRADO (2026-07-11)

Ejecutado lo planificado en `06_FRONTEND_VISUAL_UPGRADE.md` §9. Resumen (detalle completo y justificacion tecnica en ese archivo §9.5, no repetido aqui):

- Tailwind v4 + shadcn/ui instalados (primera vez en el proyecto), mapeados sobre los tokens ya existentes de `styles.css`, no como paleta paralela.
- GSAP 3.15.0 + `@gsap/react` 2.1.2 instalados para el marquee (`useInfiniteMarquee.ts`) — unica libreria de animacion, no se agrego Framer Motion.
- `vite.config.ts`/`tsconfig.json` actualizados: plugin `@tailwindcss/vite` + alias `@` -> `src`.
- `App.tsx` ya expone el Hero como vista `"home"`, reutilizando `ConnectWallet.tsx` como navbar — no se creo una navbar nueva ni se instalo React Router.
- Sin cambios en contratos, hooks de escritura ni `useNetworkStatus`/`useProjectStatus` — el Hero es puramente presentacional.
- Pendiente no bloqueante: correr `npm install` + `npm run build`/`preview` localmente para confirmar compilacion y medir Lighthouse (este asistente no tiene acceso al filesystem de WSL desde el contenedor bash, ver limitacion ya documentada arriba).

## Sesion 2026-07-17: migracion de frontend a frontend2.0 (TanStack Start)

Fecha de esta entrada: 2026-07-17 (reemplaza la fecha de cabecera de este archivo).

Se migro toda la logica funcional de la dApp desde `frontend/` (Vite SPA) hacia
`frontend2.0/` (TanStack Start, generado con Lovable como landing de
portfolio). **`frontend2.0/` pasa a ser el frontend oficial del repo de aqui
en adelante.** `frontend/` queda congelado, sin borrar, como referencia.
Detalle tecnico completo (que cambio, que no, guards de SSR, colision de
nombres "Hero", nueva ruta `/app`): `docs/08_FRONTEND_MIGRATION.md`.

Resumen:
- Migrados 1:1 (solo cambio de imports a alias `@/`): los 12 hooks de
  contrato/IPFS/tx-tracking, los 8 componentes de accion (ConnectWallet,
  ProjectList/Card/Detail, CreateProjectForm, PledgeForm, GlobalTxToasts,
  TransactionStatus), y el Hero-marquee de la dApp + sus subcomponentes
  (reubicados en `components/dapp/` para no chocar con el Hero del portfolio
  que ya ocupaba `components/landing/Hero.tsx`).
- Nueva ruta `src/routes/app.tsx` (`/app`): monta la dApp real
  (`AppShell.tsx`, mismo state machine `home/list/detail/create` del
  `App.tsx` viejo, sin logica nueva) envuelta en `WagmiProvider` +
  `TxTrackerProvider` locales, para no cargar wagmi en la landing publica de
  `/`. El CTA "Ver demo en vivo" del portfolio ya enlaza a `/app`.
- 3 guards de SSR nuevos (no existian en la SPA vieja, ver
  `08_FRONTEND_MIGRATION.md`): `wagmi.ts` (`ssr: true`),
  `TxTrackerContext.tsx` (guard `localStorage`), `lib/sounds.ts` (guard
  `Audio`) y `lib/documentText.ts` (guard del worker de pdf.js) — sin cambios
  de logica real, solo compatibilidad con el primer render en servidor.
- `frontend2.0/.env` y `src/vite-env.d.ts` creados (no existian), mismos
  valores/tipos que `frontend/.env`.
- **Pendiente no bloqueante:** correr `npm install` + `npm run dev` en
  `frontend2.0/` para que el plugin de TanStack Router regenere
  `routeTree.gen.ts` con la nueva ruta `/app` (este asistente no tiene acceso
  de ejecucion al filesystem de WSL). Los sonidos del frontend viejo ya
  estaban migrados en `frontend2.0/src/assets/sounds/` y `lib/sounds.ts`
  desde antes de esta sesion.
- **Nota sobre `deleteProject`:** el ABI/hooks migrados ya incluyen
  `deleteProject` (funcionalidad ya documentada en la sesion 2026-07-16, mas
  arriba en este mismo archivo) y `deployments/sepolia.json` ya refleja esa
  direccion (`0xb76d8fE65b68C80c71d0494Ba69E2874EdA7Ba6b`, redeploy
  2026-07-16). `frontend2.0/.env` se creo con ese mismo valor, consistente.

## Sesion 2026-07-19 (4): CI en verde — causa raiz real del fallo de `frontend2.0`

Tras 3 rondas de fixes (Node 20→22/24 en los 3 jobs, YAML invalido por `: ` sin
comillas, y el lockfile de `frontend2.0`), CI quedó en verde: `contracts` (Node
22/24) y `frontend` (Node 22/24) pasan, `gas-report` corre y comenta en PRs
(se ve "skipped" en pushes directos a `main`, es el comportamiento esperado
— solo corre en `pull_request`).

**Causa raiz real del error de lockfile (no la que se penso al principio):**
no era un problema de "el push no llego a GitHub" — el archivo si llegaba,
pero estaba mal generado. `nitro@3.0.260603-beta` (dependencia beta de
`@tanstack/react-start` para SSR, viene del scaffold de Lovable, no se toco)
arrastra `unstorage`, que declara `lru-cache` como **peer dependency
opcional**. Regenerar el lockfile con `npm install --package-lock-only` (sin
instalar `node_modules` real) resuelve mal esa relacion peer-opcional —
comportamiento inconsistente conocido de ese modo de npm. Confirmado
reproduciendo `npm ci` en un entorno limpio contra el `package.json`/
`package-lock.json` reales de GitHub (log de debug de npm: `placeDep
node_modules/nitro lru-cache@11.5.2 OK for: unstorage@2.0.0-alpha.7 want:
^11.2.6`, entrada nunca escrita completa en el lockfile generado con
`--package-lock-only`).

**Fix real:** `cd frontend2.0 && rm -rf node_modules package-lock.json && npm
install` (instalacion completa, no `--package-lock-only`) — validado de
punta a punta: `npm ci` limpio despues, 524 paquetes, 0 errores.

**Hallazgo aparte, ya corregido:** `frontend2.0/gitignore` (scaffold de
Lovable) no tenía el punto inicial — git nunca lo leyo, así que
`node_modules` de ese paquete no estaba siendo ignorado por git desde que se
creo `frontend2.0` (2026-07-17). Renombrado a `.gitignore`.

**Riesgo residual documentado (no bloqueante, no accionado ahora):** `nitro`
es beta y esta fijado sin `^` (correcto), pero el resto de dependencias del
scaffold de Lovable en `frontend2.0/package.json` usa `^` — inconsistente con
la convencion propia del proyecto ("versiones exactas, sin `^`", ver mas
arriba en este archivo). No se toco por ser scaffold de Lovable no pedido a
modificar; queda documentado por si el lockfile necesita regenerarse de cero
en el futuro y vuelve a aparecer el mismo tipo de error.

## Punto de partida para Fase 6
No iniciar hasta que Abraham de el visto bueno explicito (regla del proyecto: no avanzar de fase sin autorizacion). Checklist en `03_PLAN_FASES.md` «Fase 6»: deploy en mainnet de Base, README para usuario final, documentacion tecnica final.

## Planificado (2026-07-10, EJECUTADO 2026-07-11 — ver entrada "Hero de landing" arriba): Landing Hero + carruseles infinitos + adopcion de Tailwind/shadcn
Abraham definio (con ayuda de un prompt tecnico detallado, adaptado al stack real del proyecto) el Hero de la landing: 3 carruseles infinitos ("marquee") de imagenes reales de proyectos, en GSAP, sin librerias de carrusel de terceros. Como parte de esta tarea, a pedido explicito de Abraham (motivo: aprendizaje), se van a instalar **Tailwind CSS v4** y **shadcn/ui** — hasta ahora explicitamente fuera del stack, ver `06_FRONTEND_VISUAL_UPGRADE.md` §1/§2. Detalle completo, arbol de componentes previsto y requisitos duros (60fps, `prefers-reduced-motion`, Lighthouse ≥95): `06_FRONTEND_VISUAL_UPGRADE.md` §9. Las imagenes van en `frontend/src/assets/` (carpeta ya creada, hoy vacia), curadas a mano por Abraham — no confundir con las imagenes reales de campañas via Pinata/IPFS, que siguen su flujo normal sin cambios. **No ejecutado todavia**: esta entrada documenta la decision/plan, no una tarea cerrada. Cuando se implemente, agregar una entrada de cierre aqui con lo que realmente se instalo/ajusto.

## Nuevo doc (2026-07-10): `06_FRONTEND_VISUAL_UPGRADE.md`
Se agrego un mapa de referencia dedicado solo a mejoras visuales del frontend (animaciones, hovers, elevacion, glow/neon, transiciones de vista) para que cualquier agente lo consulte cuando Abraham pida un efecto concreto sobre `ProjectCard`/`ProjectDetail`/CTAs/etc. Cubre: por que no migrar a Next.js (evita sobre-ingenieria), stack recomendado (GSAP 3.15.0 + @gsap/react 2.1.2, CSS nativo, View Transitions API, Tailwind v4 opcional), tokens de elevacion/easing/duracion nuevos para `styles.css`, un catalogo de 8 efectos con snippet listo (incluye el ejemplo que dio Abraham: hover con elevacion + glow neon), y un checklist de accesibilidad/performance (`prefers-reduced-motion`, solo animar transform/opacity, cleanup de listeners). No es una fase mas de `03_PLAN_FASES.md`: se activa bajo demanda, sobre el frontend ya cerrado en Fases 4/5, sin tocar contratos ni hooks de escritura.

## Backend Pinata (2026-07-10): nuevo paquete `/backend`

Abraham tomo la decision pendiente en `05_CRITICAL_REVIEW.md` § Fase 5: en vez de seguir subiendo a Pinata directo desde el navegador con `VITE_PINATA_JWT` embebido, se creo un backend minimo que oculta el JWT.

### Que se hizo
- **`/backend`** (paquete Node independiente, `package.json` propio, versiones exactas verificadas en npmjs.com el mismo dia: `express@5.2.1`, `multer@2.2.0`, `cors@2.8.6`, `dotenv@17.4.2`, dev: `tsx@4.23.0`, `typescript@6.0.3`).
- **`src/pinata.ts`**: unico archivo del proyecto que lee `process.env.PINATA_JWT`. Expone `pinFileToIPFS`/`pinJSONToIPFS`.
- **`src/index.ts`**: server Express con dos rutas:
  - `POST /api/pin-file` (multipart, campo `file`) -> sube a Pinata, devuelve `{ cid }`.
  - `POST /api/pin-json` (body JSON, la metadata de la campana) -> sube a Pinata, devuelve `{ cid }`.
- **Control minimo aplicado ahora** (pedido explicito de Abraham: "que funcione", sin sistema de cuota todavia):
  - CORS restringido a un unico origen via `FRONTEND_ORIGIN` (no `origin: "*"`).
  - Whitelist de MIME types en el servidor (`application/pdf`, `text/plain`, `image/png|jpeg|gif|webp`) via `multer.fileFilter` — la whitelist que ya existia en `CreateProjectForm.tsx` es solo UX, esta es la que de verdad protege, porque un cliente puede mandar cualquier request directo al endpoint sin pasar por el formulario.
  - Limite de 10 MB por archivo (`multer` `limits.fileSize`), mismo numero que ya usaba el frontend.
- **Frontend actualizado**: `usePinataUpload.ts` ya no importa ningun JWT; llama a `VITE_BACKEND_URL` (`frontend/.env`, default `http://localhost:3001`). `vite-env.d.ts` actualizado (quito `VITE_PINATA_JWT`, agrego `VITE_BACKEND_URL`).
- **`.gitignore`**: se agrego `backend/node_modules`, `backend/dist`, `backend/.env` (el `.env` generico ya lo cubria, se hizo explicito por claridad).

### Como corre Abraham esto localmente
```bash
cd backend
npm install
cp .env.example .env
# completar PINATA_JWT con una API key de Pinata con scope restringido a pinning
# (nunca el JWT admin de la cuenta), y ajustar FRONTEND_ORIGIN/PORT si hace falta
npm run dev   # levanta en :3001 (o el PORT configurado)
```
En otra terminal, `cd frontend && npm run dev` como ya se hacia. `frontend/.env` ya trae `VITE_BACKEND_URL=http://localhost:3001` por defecto.

### Riesgo real que queda abierto (importante, no resuelto hoy a proposito)
La cuenta de Pinata usada es del **plan gratuito, 1 GB de almacenamiento total**. Pendiente explicito, no implementado ahora a pedido de Abraham ("eso lo hago yo"):
- Subir a un plan de pago de Pinata o aumentar limites, si el uso real lo justifica.
- Decidir donde alojar `/backend` en producción (hoy solo corre en `localhost`).

## Autenticacion por wallet + limite diario (2026-07-10)

A pedido de Abraham se añadio una segunda capa de control sobre `/backend`, ademas de CORS/mime/tamaño: ahora **conectar la wallet y firmar es obligatorio** para poder subir cualquier archivo o metadata, y se limita **1 subida por IP por dia**.

### Como funciona (flujo completo)
1. El frontend (`useIpfsAuth.ts`) pide un nonce al backend: `POST /api/auth/nonce { address }` -> el backend genera un nonce aleatorio de un solo uso para esa wallet (`nonceStore.ts`, vive 5 minutos, `NONCE_TTL_MS`) y devuelve el mensaje a firmar.
2. El usuario firma ese mensaje con su wallet (`useSignMessage` de wagmi, sin enviar ninguna transaccion ni gastar gas — es solo una firma).
3. El frontend manda `POST /api/auth/verify { address, signature }`. El backend:
   - Revisa el cupo diario de la IP (`rateLimiter.ts`) — si ya se agoto, corta con 429 antes de gastar mas trabajo.
   - Reconstruye el mensaje esperado con el nonce guardado y verifica la firma con `viem.verifyMessage` (recuperacion de firma ECDSA estandar, sin necesitar RPC).
   - **El nonce se borra siempre**, haya sido valida la firma o no — de ahi que sea de un solo uso real: una firma capturada por un atacante ya no sirve la segunda vez porque el nonce que firmaba ya no existe.
   - Si la firma es valida, consume el cupo diario de la IP y emite un **token de sesion** (`sessionStore.ts`, opaco, vive 15 minutos, `SESSION_TTL_MS`).
4. El frontend usa ese token (header `Authorization: Bearer <token>`) para `POST /api/pin-file` y `POST /api/pin-json` — todas las subidas de una misma creacion de proyecto (imagen + documento + metadata) reusan el mismo token, no hace falta firmar 3 veces.
5. Ambos endpoints de subida pasan primero por el middleware `requireSession` (`auth.ts`): sin token valido, 401 inmediato, nunca se le pasa el JWT de Pinata a nadie no autenticado.

### Donde cambiar el limite (pedido explicito: "un lugar sencillo")
Una sola constante en **`backend/src/config.ts`**:
```ts
export const MAX_UPLOADS_PER_IP_PER_DAY = 1;
```
Cualquiera que clone el repo cambia ese numero y reinicia el backend, sin tocar ningun otro archivo. Las otras dos constantes del mismo archivo (`NONCE_TTL_MS`, `SESSION_TTL_MS`) tambien son ajustables ahi si hiciera falta mas o menos tiempo para firmar/subir.

### Que NO cubre esto todavia (limitaciones conocidas, no resueltas a proposito)
- El contador de cupo por IP es **en memoria** (`Map` de Node): se reinicia si el proceso del backend se reinicia o si corren varias instancias en paralelo (no hay estado compartido tipo Redis). Aceptable para un backend de una sola instancia; si en el futuro se despliega con mas de un proceso/instancia, esto deja de ser confiable y necesitaria un store compartido.
- Limitar por IP es imperfecto (varias personas detras del mismo NAT/router comparten IP, una VPN cambia la IP en cada subida). Es la primera barrera barata, no una solucion definitiva contra un atacante decidido.
- Nada de esto cambia el limite real de 1 GB de Pinata: sigue siendo responsabilidad de Abraham subir de plan o migrar de proveedor cuando el uso real lo requiera.

## Sesion 2026-07-14: fix de deploy, bugs post-redeploy, rediseño visual y soporte mobile

Fecha última actualización: 2026-07-14 (reemplaza la fecha de cabecera de este archivo).

### Bug: `DEPLOYMENT_ID` colisiona con deteccion de CI de hardhat-keystore
`DEPLOYMENT_ID=sepolia-v2 npx hardhat run scripts/deploy.ts --network sepolia` fallaba con `HHE7: Configuration Variable "SEPOLIA_RPC_URL" not found` **sin pedir la contraseña del keystore**, a pesar de que la variable si estaba guardada (confirmado con `keystore get`). Causa raiz: `@nomicfoundation/hardhat-utils/dist/src/ci.js` define `isCi()` chequeando, entre otras, `env.DEPLOYMENT_ID !== undefined` (pensada para detectar Vercel Now) — `hardhat-keystore` se salta la resolucion por keystore por completo si `isCi()` da `true`. Fix: `scripts/deploy.ts` ahora lee `process.env.IGNITION_DEPLOYMENT_ID` en vez de `DEPLOYMENT_ID` (comentario explicando el porque queda en el propio script). Uso correcto desde ahora:
```bash
IGNITION_DEPLOYMENT_ID=sepolia-v2 npx hardhat run scripts/deploy.ts --network sepolia
```

### Redeploy en Sepolia: nueva direccion del contrato
El contrato en Sepolia habia quedado desactualizado (bytecode viejo, de antes del cambio de modelo sin `deadline`) porque Ignition no redeploya si ya existe un journal completo para el mismo id — solo devuelve la direccion vieja. Con `IGNITION_DEPLOYMENT_ID=sepolia-v2` se forzo un journal nuevo (`ignition/deployments/sepolia-v2/`, build-info distinto al original) y un deploy real:
- **Direccion actual en Sepolia:** `0x0C83FeC42a3A4fCc1eba99175aAE52EE16536396` (ver `deployments/sepolia.json`). La direccion vieja (`0xE97E780c...`) queda obsoleta, no usarla.
- `frontend/.env` (`VITE_CROWDFUNDING_ADDRESS_SEPOLIA`) actualizado a la direccion nueva.
- Verificado en Etherscan (`npx hardhat verify --network sepolia 0x0C83FeC42a3A4fCc1eba99175aAE52EE16536396`).

### `hardhat-verify` intenta 3 proveedores por defecto (Blockscout/Sourcify fallaban)
`npx hardhat verify` corre, sin configuracion explicita, contra Etherscan + Blockscout + Sourcify (cada uno con su propio flag `enabled`, default `true`). Blockscout fallaba por DNS (`ENOTFOUND eth-sepolia.blockscout.com`) y Sourcify por un POST fallido a la RPC de Sepolia — ninguno de los dos es requisito del proyecto (solo Etherscan/Basescan, ver `03_PLAN_FASES.md`). Fix en `hardhat.config.ts`: `verify.blockscout.enabled = false` y `verify.sourcify.enabled = false`, con comentario explicando el porque.

### Bug: `toProject` no podia desestructurar el resultado de `getProject`
`getProject` devuelve un tuple con **todos los componentes nombrados** (`creator`, `goal`, `pledged`, `claimed`, `metadataCID`) — viem decodifica eso como **objeto plano**, no como array. `toProject` en `useProjects.ts` intentaba `const [creator, goal, ...] = raw` (array destructuring), lo cual explota con `TypeError: raw is not iterable`. No se detecto antes porque con 0 proyectos creados `toProject` nunca llegaba a ejecutarse. Fix: `toProject` ahora desestructura por nombre de propiedad (`const { creator, goal, ... } = raw`).

### Bug critico: `canClaim`/`canRefund` en `ProjectDetail.tsx` nunca se activaban
Quedaban de la epoca con `deadline`: exigian `projectStatus.isExpired`, campo que ya no existe en el modelo actual (sin fecha de cierre) y que por lo tanto siempre era `undefined` (falsy). Efecto: los botones "Reclamar fondos" y "Pedir reembolso" jamas aparecian, sin importar el estado real del proyecto. Fix segun `02_SMART_CONTRACT_SPEC.md`: `canClaim = isCreator && isSuccessful && !claimed` (sin exigir expiracion); `canRefund = !claimed && myPledge > 0n` (tampoco depende de `isSuccessful`, el backer puede arrepentirse en cualquier momento antes del claim).

### IPFS: gateway de Pinata en vez de `ipfs.io`, y aclaracion sobre "texto plano"
El link "ver en IPFS" de `ProjectDetail.tsx` devolvia 502 ("no se encontraron proveedores") via `ipfs.io` cuando el contenido recien pineado en el plan gratuito de Pinata aun no se propago a la red publica de IPFS/DHT. Cambiado a `https://gateway.pinata.cloud/ipfs/<CID>` (sirve directo lo que el propio proyecto pineo, sin depender de la red publica). Aclaracion importante que quedo resuelta en la misma sesion: ver el JSON crudo de metadata como texto plano al abrir el link **es el comportamiento correcto y esperado de IPFS** (sirve bytes crudos, no renderiza paginas) — el gap real no era ese, sino que la DApp nunca leia ese JSON para mostrar titulo/imagen/descripcion en su propia UI (ver siguiente punto).

### Feature: metadata de IPFS renderizada dentro de la DApp
- **`useProjectMetadata.ts`** (nuevo hook): fetch cacheado (`react-query`, `staleTime: Infinity` porque un CID es inmutable) del JSON de metadata via gateway de Pinata. Devuelve `{ metadata, imageUrl, documentUrl }`.
- **`ProjectCard.tsx`**: muestra imagen real (o inicial del titulo como placeholder) + titulo real en vez de "Proyecto #N".
- **`ProjectDetail.tsx`**: titulo, imagen y descripcion reales; separa el link a metadata cruda ("ver JSON crudo") del link al documento adjunto ("ver documento adjunto", si existe `documentCID`).

### UI: boton "Volver" en Explorar proyectos + transicion de vista
`App.tsx`: nueva `.view-toolbar` en la vista `list` con boton "← Volver" (a `home`) junto a "+ Nuevo proyecto" — antes no habia forma explicita de salir de esa vista. Se agrego tambien `.view-fade` (fade + leve translateY al cambiar de vista, via `key={view.name}` para reiniciar la animacion), respetando `prefers-reduced-motion` (ya cubierto globalmente).

### Rediseño visual: paleta oscura y calida
A pedido explicito de Abraham ("colores calidos, oscuro, elegante, profesional"). Todo el cambio vive en los tokens `:root` de `styles.css` (el resto del CSS ya los referenciaba via `var()`, asi que un solo lugar de cambio actualizo toda la app, incluidos los componentes de Tailwind/shadcn del Hero via el alias `@theme`):
- Fondo espresso oscuro (`--paper: #16110d`), superficie elevada para cards/panels (`--panel`, token nuevo, antes las cards usaban `background: white` hardcodeado), acento oro antiguo (`--accent`/`--accent-strong`, antes verde salvia claro). Eleccion deliberada para evitar el cliche de "negro + verde acido/vermellon" de paletas oscuras genericas — el oro conecta tematicamente con "financiacion/capital".
- Botones: transicion + glow sutil al hover (reutilizando tokens `--dur-*`/`--ease-out-expo`/`--glow-accent` que ya existian pero no se aplicaban a botones normales).
- `.project-card`/`.showcase-card`: elevacion al hover (`translateY` + sombra en capas), ya definido para el Hero, ahora tambien en las cards de proyectos.
- Se encontro y corrigio de paso un gap preexistente: `.file-field`/`.file-attachment-card` (drag-and-drop de documento en `CreateProjectForm.tsx`) nunca habian tenido CSS propio.

### Soporte para celulares — ver `07_MOBILE_SUPPORT.md`
Documento nuevo dedicado (`docs/07_MOBILE_SUPPORT.md`) con el diagnostico completo y el detalle de cada clase CSS tocada. Resumen: todo el trabajo fue CSS-only dentro de un `@media (max-width: 640px)` (extendido, no duplicado) — header/formularios/toasts pasan a apilarse en vez de comprimirse, botones con `min-height: 44px` para area tactil comoda. El meta viewport de `index.html` ya estaba correcto desde Fase 4, no requirio cambios. Pendiente no bloqueante: validar en un dispositivo fisico real (solo se probo en devtools/responsive mode).

## Sesion 2026-07-16: nueva funcion `deleteProject` (borrar proyecto)

A pedido de Abraham: boton para que el creador de un proyecto lo elimine desde el frontend, haya o no retirado los fondos. Detalle completo del analisis de riesgo, la decision tomada y por que un borrado incondicional hubiera sido un bug critico de fondos bloqueados: ver `05_CRITICAL_REVIEW.md` § "Nueva funcion: deleteProject (2026-07-16)".

**Resumen de cambios:**
- `contracts/Crowdfunding.sol`: nueva funcion `deleteProject(id)` (solo `creator`, solo si `pledged == 0 || claimed`), nuevo error `ProjectHasActiveFunds`, nuevo evento `ProjectDeleted`, y un chequeo extra en `pledge` para rechazar aportes a un proyecto ya borrado (`creator == address(0)`).
- `test/Crowdfunding.ts`: 7 tests nuevos cubriendo el happy path (sin pledges, con claim previo), el revert de proteccion (`ProjectHasActiveFunds`, confirmando que el backer igual puede reembolsarse), borrado post-reembolso, `NotProjectCreator`/`ProjectNotFound`, y que un proyecto borrado ya no acepta `pledge`.
- `frontend/src/contracts/crowdfundingAbi.ts`: agregada la funcion, el error y el evento nuevos.
- `frontend/src/hooks/useDeleteProject.ts` (nuevo): mismo patron que `useRefund.ts`/`useClaimFunds.ts`.
- `frontend/src/components/ProjectDetail.tsx`: boton "Eliminar proyecto" (con `window.confirm`), visible solo si `isCreator && (project.claimed || project.pledged === 0n)` — mismo criterio exacto que el contrato. Al confirmarse la tx, vuelve al listado (`onBack()`) en vez de refrescar (el proyecto ya no existe).
- `frontend/src/hooks/useProjects.ts`: el listado ahora filtra proyectos con `creator == address(0)` (borrados), para no mostrarlos como "proyectos fantasma".
- `frontend/src/lib/txErrors.ts`: mensaje legible para `ProjectHasActiveFunds`.
- `frontend/src/styles.css`: nueva clase `button.danger` (reutiliza el token `--danger` ya existente, antes sin uso en botones).

**IMPORTANTE — pendiente de accion de Abraham, este cambio no esta en el contrato ya desplegado:** `Crowdfunding.sol` cambio de bytecode. El contrato real en Sepolia (`0x0C83FeC42a3A4fCc1eba99175aAE52EE16536396`) NO tiene `deleteProject` todavia. Hay que forzar un redeploy con un `IGNITION_DEPLOYMENT_ID` nuevo (Ignition no redeploya si ya existe un journal para el mismo id — ver bug ya documentado arriba, sesion 2026-07-14):
```bash
IGNITION_DEPLOYMENT_ID=sepolia-v3 npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat verify --network sepolia <DIRECCION_NUEVA>
```
Despues, actualizar `frontend/.env` (`VITE_CROWDFUNDING_ADDRESS_SEPOLIA`) con la direccion nueva. Sin este paso, el boton "Eliminar proyecto" llamaria a una funcion inexistente en el contrato real y la tx revertiria/fallaria en la simulacion previa.

## Fix (2026-07-16): texto de adjunto (.txt/.pdf) truncado o ausente en "Descripcion"

Bug reportado por Abraham: al subir un documento adjunto con texto largo, el contenido no se reflejaba en el textarea de Descripcion; ademas los PDF nunca mostraban su texto (solo se leian los .txt). Causas:

1. **`MAX_PREVIEW_CHARS = 400`** en `CreateProjectForm.tsx` descartaba el texto completo (`setDocumentPreview(undefined)`) apenas superaba 400 caracteres — cualquier .txt medianamente largo simplemente no se insertaba. Eliminado: ahora no hay limite de longitud, a pedido explicito de Abraham.
2. **Los PDF nunca se leian como texto** (`attachmentFile.type !== "text/plain"` cortaba antes de intentarlo), solo se mostraban como tarjeta de adjunto. Como Abraham pidio el mismo comportamiento para PDF y .txt, esto requeria extraccion real de texto de PDF, que un navegador no hace nativamente sin una libreria.

**Fix aplicado:**
- Nuevo `frontend/src/lib/documentText.ts` con `extractTextFromFile(file)`: `.txt` via `File.text()`, `.pdf` via `pdfjs-dist` (`getDocument` + `getTextContent()` por pagina, unidas con salto de linea doble entre paginas). Devuelve `undefined` si no hay texto extraible (ej. PDF escaneado como imagen sin capa de texto) — el archivo se sigue subiendo igual como adjunto.
- **Nueva dependencia `pdfjs-dist@6.1.200`** (version exacta, verificada en npmjs.com el mismo dia — es la ultima estable). Justificada porque no hay forma de leer texto de un PDF en el navegador sin una libreria: no es una dependencia agregada por comodidad, es la unica via real de cumplir el pedido igual para PDF que para .txt.
- El worker de pdf.js corre aparte (`pdfjs-dist/build/pdf.worker.mjs?url`, resuelto por Vite de forma nativa) para no bloquear el hilo principal al parsear un PDF grande.
- `CreateProjectForm.tsx`: nuevo estado `isExtractingText` (deshabilita el envio mientras se lee el archivo, con el boton mostrando "Leyendo archivo…"), reemplaza el `FileReader` manual por `extractTextFromFile`.
- **Por que no se regenera el archivo original con las ediciones del usuario:** el documento crudo (`documentCID`) se sigue subiendo tal cual a IPFS (sirve como adjunto descargable original). Lo que realmente importa — el contenido mostrado en la app — ya usa siempre el valor actual del textarea de Descripcion al momento de enviar (`usePinataUpload.upload(title, description, ...)`), asi que cualquier edicion del usuario sobre el texto insertado ya tenia prioridad de fondo; el bug era que el texto largo nunca llegaba a insertarse en primer lugar.

**Pendiente para Abraham:** correr `cd frontend && npm install` para bajar `pdfjs-dist` antes de `npm run dev`/`build`.

### Redeploy ejecutado por Abraham (2026-07-16): nueva direccion con `deleteProject`
- **Direccion actual en Sepolia:** `0xb76d8fE65b68C80c71d0494Ba69E2874EdA7Ba6b` (ver `deployments/sepolia.json`, `deployedAt: 2026-07-16T18:58:16.219Z`). La direccion anterior (`0x0C83FeC42a3A4fCc1eba99175aAE52EE16536396`) queda obsoleta, ya no incluye `deleteProject`.
- `frontend/.env` (`VITE_CROWDFUNDING_ADDRESS_SEPOLIA`) actualizado a la direccion nueva.
- Pendiente no bloqueante: correr `npx hardhat verify --network sepolia 0xb76d8fE65b68C80c71d0494Ba69E2874EdA7Ba6b` para que el codigo fuente quede visible en Etherscan (mismo comando que en el redeploy anterior, sesion 2026-07-14).

## Sesion 2026-07-18: dApp embebida en `/` + borrado de `frontend/`

- **Ruta `/app` eliminada de `frontend2.0/`:** la dApp funcional (`AppShell`, con su Hero/marquee real e imagenes) ahora vive como seccion `#demo` dentro de la landing (`/`), via el nuevo `components/landing/DemoSection.tsx` (monta `WagmiProvider`/`TxTrackerProvider`/`AppShell`, sin logica nueva — solo mueve donde ya vivia). `routes/app.tsx` quedo vacio; `routeTree.gen.ts` se ajusto a mano para quitar esa ruta (se regenerara solo al correr `npm run dev`).
- **CTA del Hero de landing corregido:** "Ver demo en vivo" ahora hace scroll a `#demo` en la misma pagina en vez de navegar a `/app` (ruta que ya no existe). Se elimino el boton muerto "Ver el codigo" (sin URL real).
- **Nueva seccion `components/landing/ArchitectureDecisions.tsx`:** bloque corto de 4 decisiones de arquitectura + justificacion (sin deadline, pull-payment, backend propio para IPFS, ReentrancyGuardTransient), visible antes de la demo.
- **Fix SSR:** `lib/documentText.ts` importaba `pdfjs-dist` de forma estatica; al quedar `CreateProjectForm` alcanzable desde `/` (antes solo desde `/app`, nunca evaluado en el primer render de la landing), el SSR de TanStack Start evaluaba ese import y truena (`ReferenceError: DOMMatrix is not defined`, API de navegador inexistente en Node). Fix: import de `pdfjs-dist` movido a dinamico (`await import(...)`) dentro de `extractTextFromFile`, solo se carga en cliente.
- **Fix branding:** `routes/__root.tsx` tenia metadata placeholder del scaffold de Lovable (`title: "Lovable App"`, `author: "Lovable"`, etc.) nunca personalizada — corregido con el nombre real del proyecto.
- **Fix CORS:** `backend/.env` (`FRONTEND_ORIGIN`) seguia apuntando a `http://localhost:5173` (puerto del `frontend/` viejo con Vite SPA). Corregido a `http://localhost:8080` (puerto real de `frontend2.0` en dev, via `@lovable.dev/vite-tanstack-config`). Recordatorio: `dotenv` solo lee `.env` al arrancar el proceso — un cambio en `.env` requiere reiniciar el backend, no basta con guardar el archivo.
- **`frontend/` (Vite SPA vieja) eliminada del repo:** confirmado que ningun archivo de `frontend2.0/`/`backend/` la importaba o referenciaba. Detalle completo de esta sesion: `docs/08_FRONTEND_MIGRATION.md` § "Sesion 2026-07-18".
- **Pendiente no bloqueante:** `frontend2.0/public/` no existe — falta un `favicon.ico` real (Abraham debe agregarlo a mano, no generable desde aqui).

## Sesion 2026-07-19: tests nuevos — cierre de huecos de cobertura

Tras confirmar `npx hardhat test` en 29/29 (desglose: 22 en `test/Crowdfunding.ts`, 5 en `test/PledgeFuzz.ts`, 2 en `test/ReentrancyAttack.ts`), se identificaron 4 huecos de cobertura reales en `test/Crowdfunding.ts` y se agregaron 9 tests nuevos para cerrarlos. **Total actual: 38/38 pasando.**

- **`createProject` — borde superior de `goal`:** nuevo test confirma que `type(uint96).max` es un `goal` valido de punta a punta. Aclaracion importante detectada al escribir el test: `goal` esta declarado como `uint96` directo en la firma de `createProject` (no como `uint256` con cast interno), asi que **no hay ningun `SafeCast` que revierta para `goal`** — un valor fuera de rango lo rechaza el ABI encoder antes de llegar al contrato. Distinto de `msg.value` en `pledge`, que si es `uint256` y si usa `SafeCast.toUint96()`. El pendiente que se habia anotado como "falta el mismo borde de SafeCast para goal" estaba mal planteado; quedo corregido en el test.
- **`pledge` — dos backers distintos en el mismo proyecto:** el unico test previo de acumulacion usaba el mismo backer dos veces. Nuevo test confirma que `project.pledged` suma correctamente entre backers distintos y que `pledgeOf` de uno no contamina al otro (escenario de uso real, no solo de borde).
- **Vistas (`getProject`/`pledgeOf`/`isSuccessful`) — nuevo describe dedicado**, antes solo se ejercitaban indirectamente dentro de otros tests:
  - Borde exacto de `isSuccessful` (`pledged == goal - 1` -> `false`, `pledged == goal` -> `true`), relevante porque `05_CRITICAL_REVIEW.md` ya documento un bug real en esta funcion (`id` inexistente leyendo como "exitoso").
  - `pledgeOf` devuelve `0` sin revertir para un backer que nunca aporto.
  - `getProject`/`isSuccessful` revierten `ProjectNotFound` con un `id` inexistente.
- **Gas regression guards en `claimFunds`/`refund`/`deleteProject`:** ninguna de estas 3 funciones tenia ningun assert de gas (a diferencia de `createProject`/`pledge`, que si tienen limite duro del cliente). Se agrego un techo de 150k gas por funcion — **no es un requisito duro del cliente** (`00_PROJECT_OVERVIEW.md` solo exige limite en `createProject`/`pledge`), es solo una red de seguridad para detectar una regresion real (ej. un loop agregado por error) antes de que llegue a produccion.

**No se toco `contracts/Crowdfunding.sol`** en esta sesion: los 9 tests nuevos son cobertura pura, ningun bug de contrato encontrado al escribirlos.

**Sigue pendiente (no cerrado por esta sesion):** cobertura automatizada del lado frontend (`frontend2.0/`). Sigue siendo el hueco de mayor riesgo real: los bugs detectados hasta ahora en el proyecto (`canClaim`/`canRefund` nunca activandose, destructuring roto de `toProject`) fueron ahi, no en el contrato — y ese lado sigue sin ningun test automatizado.

## Sesion 2026-07-19 (2): cobertura de tests en frontend2.0

Primera cobertura automatizada del lado frontend (`frontend2.0/`), cerrando el hueco de mayor riesgo real que quedaba abierto en la entrada anterior. Herramientas: **Vitest 4** (ya estaba en `package.json`, motor compartido con Vite) + **React Testing Library** (`@testing-library/react@16.3.2`, `@testing-library/jest-dom@6.9.1`, ya estaban en `package.json` de una sesion previa sin usar todavia).

- **`vitest.config.ts`** (nuevo, en la raiz de `frontend2.0/`): config standalone, separada de `vite.config.ts` porque ese archivo esta envuelto por `@lovable.dev/vite-tanstack-config` y no expone un passthrough de `test`. Usa `resolve.tsconfigPaths: true` (soporte nativo de Vite, reemplaza el plugin `vite-tsconfig-paths` que el propio Vitest marco como deprecado al correrlo).
- **`src/setupTests.ts`** (nuevo): carga los matchers de `@testing-library/jest-dom` (`toBeInTheDocument()`, etc.) antes de cada archivo de test.
- **Refactor previo a testear** (extraer logica pura de componentes, mismo criterio en los 2 casos): la logica de negocio vivia inline dentro de JSX/componentes, dificil de testear sin montar React. Se extrajo a `src/lib/`:
  - **`projectPermissions.ts`**: `canPledgeProject`/`canClaimProject`/`canRefundProject`/`canDeleteProject`, sacadas de `ProjectDetail.tsx`. Es exactamente la logica que ya causo un bug real (`canClaim`/`canRefund` nunca se activaban por un `isExpired` fantasma, ver sesion 2026-07-14 mas arriba) — quedar sin test ahi era el riesgo mas alto del proyecto.
  - **`projectStatusLabel.ts`**: `getProjectStatus` (label "In progress"/"Goal reached"/"Withdrawn"), sacada de `ProjectCard.tsx`.
  - `ProjectDetail.tsx`/`ProjectCard.tsx` ahora importan estas funciones en vez de tener la logica inline — sin cambio de comportamiento, solo de ubicacion.
- **Tests nuevos, 23 pasando:**
  - `src/lib/projectPermissions.test.ts` (14 tests): cubre los 4 permisos con sus combinaciones de bloqueo (no-creator, no-exitoso, ya reclamado, red no soportada, fondos activos).
  - `src/lib/projectStatusLabel.test.ts` (3 tests): los 3 estados visuales.
  - `src/lib/txErrors.test.ts` (3 tests): `toReadableError` — error custom mapeado, error sin mapear (fallback a `shortMessage`), valor que no es `BaseError`.
  - `src/hooks/useProjects.test.ts` (3 tests): mockea `wagmi` completo con `vi.mock("wagmi", async (importOriginal) => ...)` preservando el resto real via `importOriginal` (no romper `createConfig`/`http`/`injected` que usa `wagmi.ts`). Cubre el bug historico exacto de `toProject` (objeto nombrado de `getProject`, no array — ver sesion 2026-07-14), el filtro de proyectos borrados (`creator == address(0)`), y `useProject` individual.
- **Bug real encontrado y descartado durante esta sesion (documentado para no repetir el analisis):** el primer intento de `useProjects.test.ts` mockeaba `nextProjectId` (uint32) como `1n` (bigint), lo cual hacia explotar `Array.from({ length: count })` con `TypeError: Cannot convert a BigInt value to a number`. Se verifico contra `viem@2.54.1` real (no de memoria, `decodeAbiParameters` en un script aislado) que viem decodifica `uint8..uint48` como `number` y solo `uint56+` como `bigint` — `nextProjectId` (uint32) es `number` en runtime real, asi que **no hay bug en produccion**, el error era el tipo incorrecto en el mock del test. Corregido a `data: 1` (number).
- **Fuera de alcance a proposito (decision ya tomada, no revisitada esta sesion):** tests E2E con wallet real (Playwright + Anvil) — mucho mas caro de mantener, y no es donde ocurrieron los 2 bugs reales del proyecto hasta ahora.

### Como correr los tests
```bash
cd frontend2.0
npm run test
```

## Sesion 2026-07-19 (3): CI (GitHub Actions) — punto 1 de `09_ROADMAP_MEJORAS.md` CERRADO

Agregado `.github/workflows/ci.yml`, 3 jobs:

- **`contracts`**: matrix Node 20/22, `npm ci` + `npm run compile` + `npm test` en la raiz (38 tests, incluye los asserts duros de gas 350k/120k).
- **`gas-report`**: solo en `pull_request`, corre `REPORT_GAS=true npm run test:gas` y postea el resultado como comentario en el PR via `actions/github-script` — hace visible en cada PR la restriccion dura de gas del cliente (`00_PROJECT_OVERVIEW.md`) sin que nadie tenga que correrlo local.
- **`frontend`**: matrix Node 20/22, `working-directory: frontend2.0`, `npm ci` + `npm run test` (23 tests Vitest).

**Decision tomada (detalle completo en `09_ROADMAP_MEJORAS.md` § 1):** hibrido de las opciones B+C del roadmap — matrix de Node sin cache de dependencias (el repo es chico, el hashing de cache no se justifica todavia) + gas report automatizado en PR. Ningun script inventado: los 4 comandos usados (`compile`, `test`, `test:gas`, `test` de `frontend2.0`) se verificaron contra los `package.json` reales antes de escribir el YAML.

**Pendiente no bloqueante:** correr un PR real para confirmar que el comentario de gas-report se postea correctamente (no verificable desde este entorno sin acceso a GitHub Actions en ejecucion).

