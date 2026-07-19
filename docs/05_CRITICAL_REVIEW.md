# Revisión crítica de la propuesta original
 
## Contradicciones detectadas
1. **"On-chain la mayor parte posible" vs "no debe ser gigante ni complejo"**: subir frontend/IPFS content on-chain (ej. imágenes) rompe el presupuesto de gas (350k/120k) y no aporta valor real — nadie lee HTML desde un explorador de bloques. Decisión tomada: solo lógica financiera on-chain; presentación off-chain (React estático) + IPFS para metadata. Esto SÍ es "descentralizado" en lo que importa (custodia de fondos) sin inflar gas.
2. **"Funciones que cambian estado al final del archivo, tras cargar todo correctamente"**: esto es una convención de legibilidad válida, pero no aporta seguridad real por sí sola — en Solidity el orden textual de funciones no afecta el runtime ni previene ataques. Lo que sí previene reentrancy es CEI + `nonReentrant`, que ya está incluido. Se mantiene el orden por legibilidad/mantenibilidad (pedido explícito), pero no debe venderse al cliente como medida de seguridad.
3. **Restricción de gas dura (350k/120k) calculada para L2**: en L1 mainnet esos mismos límites serían generosos para `createProject` pero ajustados para `pledge` si se usa un mapping anidado sin optimizar el slot. El diseño con `uint96`/`uint40` empaquetados en un solo slot (struct packing) es lo que hace viable cumplir 120k gas de forma consistente — sin ese empaquetado el límite sería arriesgado.
## Huecos que el cliente no mencionó pero son necesarios
- **Qué pasa si el creador crea un proyecto y nunca hay backers**: cubierto — `refund` no aplica (no hay pledges), y no hay fondos bloqueados porque nunca hubo depósito.
- **Ataque de front-running en `claimFunds`**: mitigado porque solo `creator` puede llamarlo y el monto ya es fijo on-chain; no hay ventana de manipulación de precio (no hay oráculo).
- **Divisibilidad de `uint96`**: si en el futuro se soporta ERC-20 con 18 decimales y montos grandes, `uint96` podría quedarse corto. Está documentado en `02_SMART_CONTRACT_SPEC.md` como ajuste futuro, no un bug actual.
## Recomendación de mi parte (no pedida explícitamente, mejora la propuesta)
Añadir a Fase 2 un test específico de "grief" donde un mismo backer hace pledge 0 repetidamente para ver si algún evento o cálculo se rompe con montos cero — no cuesta nada y cierra un vector de confusión de UX/logs.

## Bugs encontrados y corregidos al implementar Fase 1 (2026-07-05)
Esta spec, aunque sólida en el diseño general, tenía huecos concretos que solo aparecieron al escribir el código real:

1. **`isSuccessful`/`isExpired` sobre un `id` inexistente devolvían `true`/comparaciones con datos en cero** (`pledged=0 >= goal=0`). Un proyecto que nunca existió parecía "exitoso". Fix: `_requireProjectExists` en toda función que recibe un `id`.
2. **Conversión `uint256 → uint96`/`uint40` sin `SafeCast` trunca en silencio** en vez de revertir — Solidity 0.8 solo hace checked arithmetic en operaciones (+, -, *), no en casts explícitos de tipo. Un `msg.value` mayor a `type(uint96).max` se habría truncado sin error. Fix: `SafeCast.toUint96`/`toUint40` en todas las conversiones.
3. **`goal == 0` rompía la semántica de éxito/fracaso** (ver punto 1). Fix: `require(goal > 0)` vía error `InvalidGoal`.
4. La recomendación de "test de grief con pledge=0" de este mismo documento se resolvió de raíz: en vez de solo testear el comportamiento, se **rechaza `msg.value == 0`** directamente (`ZeroPledge`), eliminando el vector de ruido de eventos en vez de solo documentarlo.

Detalle del código y del resto de decisiones: `02_SMART_CONTRACT_SPEC.md` y `04_STATUS.md`.

## Revisión manual — Fase 2 (2026-07-06)

Checklist de `02_SMART_CONTRACT_SPEC.md` § Seguridad, verificado línea por línea contra `contracts/Crowdfunding.sol` real:

| Item del checklist | Estado | Evidencia |
|---|---|---|
| CEI en pledge/claimFunds/refund | OK | claimFunds/refund escriben estado antes del .call; pledge no tiene interaction. |
| nonReentrant como segunda capa | OK | ReentrancyGuardTransient, verificado con ataque real en test/ReentrancyAttack.ts. |
| Sin transfer/send | OK | Ambas salidas usan .call{value}("") + require(success). |
| Sin loops no acotados | OK | Ningún for/while; refund es individual. |
| deadline validado en creación | OK | durationSeconds > 0 garantiza deadline > block.timestamp al crear. |
| Fee de plataforma | N/A | No se implementa en v1 (decisión ya tomada). |

### Hallazgos nuevos de esta revisión

1. Borde de isExpired es estrictamente mayor, no mayor-o-igual: en block.timestamp == deadline el proyecto AUN acepta pledges. Coherente con la spec original, pero no tenía test del borde exacto — se agregó en test/PledgeFuzz.ts.
2. La suma de pledges[id][backer] en uint96 puede desbordar si un mismo backer se acerca al máximo y vuelve a aportar. Es un overflow checked de Solidity 0.8 (panic 0x11): revierte correctamente, no hace wrap-around silencioso. Confirmado con test dedicado.
3. SafeCast.toUint96 en pledge nunca se había ejercitado con un valor real fuera de rango (los tests de Fase 1 solo usaban montos pequeños). Se agregó test forzando el balance de la cuenta para probar el revert real.
4. Se probó también el caso donde el propio atacante crea el proyecto (queda como creator) para atacar claimFunds: el guard lo bloquea igual, ser creator no da ninguna ventaja para reentrar.

### Limitación de esta revisión (superada)
Esta limitación quedó resuelta: ver "Slither — ejecutado (2026-07-07)" más abajo. Sigue pendiente correr `npm test` localmente para confirmar en la práctica que los tests nuevos de Fase 2 pasan (los 17 de Fase 1 ya están confirmados 17/17, ver `04_STATUS.md`).

## Slither — ejecutado (2026-07-07)

`slither-analyzer` no estaba disponible como binario nativo en el entorno de análisis (sin acceso de red a `binaries.soliditylang.org`), así que se instaló `slither-analyzer` vía `pip` y se compiló el contrato con `solc-js` (paquete npm `solc@0.8.28`) en modo `--standard-json`, con todos los imports de OZ 5.6.1 resueltos e inlineados manualmente (sin remappings, ya que `solc-js` en CLI no soporta un import callback para resolver `node_modules/`). Se analizaron `contracts/Crowdfunding.sol` y `contracts/mocks/ReentrancyAttacker.sol` juntos. Slither reportó **19 resultados en 6 categorías de detector**, ninguno crítico ni que requiera cambio de código:

| Detector | Dónde | Severidad real | Por qué no aplica / ya está mitigado |
|---|---|---|---|
| `reentrancy-benign` | `ReentrancyAttacker.receive()` (solo el mock de test, no el contrato de producción) | Ninguna | Es el propio mock de ataque de `test/ReentrancyAttack.ts`; escribe variables de diagnóstico (`reentrantCallReverted`) después de una llamada externa, pero nunca mueve fondos. No forma parte del contrato desplegado. |
| `timestamp` | `_isSuccessful` / `_isExpired` en `Crowdfunding.sol` | Informativo | Uso esperado y documentado de `block.timestamp` para deadlines de días/semanas; la manipulación de timestamp por un minero está acotada a segundos y no cambia el resultado de una campaña de crowdfunding. |
| `assembly` | `TransientSlot.sol` / `SafeCast.sol` (código de OpenZeppelin, no nuestro) | Ninguna | Assembly interno de una librería auditada de OZ 5.6.1, no código propio del proyecto. |
| `pragma` (versiones mixtas) | `SafeCast.sol` declara `^0.8.20`, el resto `^0.8.24` | Informativo | Es el pragma del propio archivo de OZ, no algo que el proyecto controle. El compilador real usado por `hardhat.config.ts` es `0.8.28` para todo el proyecto. |
| `solc-version` | Mismo `^0.8.20` de `SafeCast.sol` | Falso positivo en este contexto | El detector señala bugs conocidos de versiones *antiguas* de solc que cumplan ese pragma; el proyecto real compila con solc `0.8.28`, donde esos bugs ya están corregidos. Es una advertencia sobre el rango declarado, no sobre el compilador efectivamente usado. |
| `low-level-calls` | `.call{value}()` en `claimFunds`/`refund` | Ya justificado | Decisión de diseño explícita en `02_SMART_CONTRACT_SPEC.md` (evitar el límite de 2300 gas de `transfer`/`send`, EIP-1884), con CEI + `nonReentrant` como mitigación. |

**Conclusión:** Slither no encontró ninguna vulnerabilidad nueva ni real en `Crowdfunding.sol`. Los 19 resultados son ruido esperado de librerías de terceros (OZ) o patrones ya documentados y justificados en la spec. No se requieren cambios de código a raíz de este análisis.

**Nota de entorno (para reproducir):** el sandbox donde se corrió este análisis no tenía acceso a `binaries.soliditylang.org` (solo a `pypi.org`/`registry.npmjs.org`/`github.com`), así que se usó `solc-js` en vez del `solc` nativo vía un wrapper de shell que traduce `--standard-json` y filtra una línea de log no-JSON (`>>> Cannot retry compilation with SMT...`) que `solc-js` imprime en stdout y que rompía el parseo de `crytic-compile`. Si Abraham corre Slither localmente en WSL con `solc` nativo instalado (vía `solc-select` o el binario de `solc-js`/Hardhat), no debería necesitar ninguno de estos workarounds — puede correr directamente `slither contracts/Crowdfunding.sol --solc-remaps @openzeppelin=node_modules/@openzeppelin`.

## Revisión crítica — Fase 5 (2026-07-08): subida de metadata a IPFS desde el navegador

**Problema real, no hipotetico:** Fase 5 requiere subir la metadata de cada campaña a IPFS antes de llamar a `createProject`. El unico proveedor disponible en este proyecto es Pinata, y no existe un backend propio (el stack completo es Hardhat + frontend estatico) que pueda actuar de proxy y ocultar la credencial. Esto deja dos opciones reales, no tres:

1. **Subir directo desde el navegador con una API key de Pinata embebida** (`VITE_PINATA_JWT`) — la opcion implementada. Cualquiera puede extraer esa key del bundle de JS publico e inspeccionarla.
2. **Agregar un backend/funcion serverless minima** que reciba el archivo, guarde el JWT del lado del servidor, y solo exponga un endpoint propio al frontend — mas seguro, pero fuera del alcance de Fase 5 (agrega una pieza de infraestructura nueva no pedida por el cliente).

**Decision tomada:** opcion 1, con mitigacion obligatoria — usar una **API key de Pinata con scope restringido** (Pinata permite crear keys limitadas a `pinFileToIPFS`/`pinJSONToIPFS`, sin permisos de administracion, borrado masivo, ni acceso a otras campañas/cuentas). Con esa key, el peor caso de una key filtrada es que un tercero suba contenido arbitrario contra la cuota de Abraham (costo/abuso de cuota), **no** que pueda borrar, listar, o modificar contenido existente. Documentado en `frontend/.env.example` y `04_STATUS.md` § Fase 5.

**Por que no se implemento la opcion 2 en su momento:** agregar un backend nuevo cambiaba la arquitectura del proyecto (00_PROJECT_OVERVIEW.md la definia como Hardhat + frontend estatico, sin servidor propio) y no habia sido pedido explicitamente en Fase 5. Quedo como mejora recomendada, a ejecutar si el cliente crecia o el abuso de cuota se volvia un problema real.

## Decision revertida (2026-07-10): se implementa la opcion 2 — backend minimo

Abraham autorizo y se implemento la **opcion 2** descartada arriba: un backend Express minimo en `/backend` que es el unico que conoce `PINATA_JWT`. El frontend ya no tiene ningun JWT de Pinata en su bundle.

- **Que hace:** dos endpoints, `POST /api/pin-file` (multipart, reenvia a `pinFileToIPFS`) y `POST /api/pin-json` (reenvia a `pinJSONToIPFS`). El frontend (`usePinataUpload.ts`) ahora llama a `VITE_BACKEND_URL` en vez de `api.pinata.cloud` directamente.
- **Control minimo aplicado ahora:** CORS restringido a un unico origen (`FRONTEND_ORIGIN`), whitelist de MIME types (`application/pdf`, `text/plain`, imagenes comunes) y limite de 10 MB por archivo — validado en el servidor, no solo en el cliente (la validacion del cliente en `CreateProjectForm.tsx` se puede evadir; esta es la que realmente cuenta).
- **Lo que NO se implemento todavia (a proposito, fuera de alcance de esta tarea):** autenticacion de quien llama al backend (hoy cualquiera que conozca la URL puede subir archivos, solo limitado por CORS de navegador, que un script fuera del navegador evade trivialmente), rate limiting, y control de cuota. Esto es critico porque **la cuenta de Pinata usada es del plan gratuito (1 GB total)**: sin limite de uso, cualquiera que llegue al endpoint puede agotar la cuota completa de Abraham. Documentado como pendiente inmediato en `04_STATUS.md` § "Backend Pinata" y como candidato a resolver antes de exponer el backend fuera de `localhost`.
- **Por que ahora si se justifica el backend:** la superficie de riesgo dejo de ser "cualquiera puede leer el JWT del bundle" (riesgo alto, sin mitigacion real posible del lado del cliente) a "cualquiera puede llamar al endpoint sin limite" (riesgo medio, mitigable con rate limiting/API key propia, que es trabajo pendiente pero acotado). Sigue siendo una arquitectura mas simple que un backend completo con base de datos/usuarios: es solo un proxy con validacion, sin estado persistente propio.

## Nueva funcion: `deleteProject` (2026-07-16)

Abraham pidio que el creador de un proyecto pueda borrarlo desde el frontend, haya o no retirado los fondos. Analisis de riesgo antes de implementar:

**Por que un borrado incondicional seria un bug critico:** `delete projects[id]` resetea todo el struct a sus valores por defecto, incluido `pledged` (vuelve a 0) y `claimed` (vuelve a `false`). Si se permitiera borrar un proyecto con `pledged > 0 && !claimed` (fondos de backers todavia dentro del contrato, sin reclamar), cualquier backer que llamara `refund` despues subiria `pledges[id][backer] > 0` contra un `project.pledged` ya en 0 — la resta `project.pledged -= amount` desbordaria (panic 0x11, `checked` arithmetic de Solidity 0.8) y revertiria **siempre**, dejando ese ETH bloqueado en el contrato para siempre (viola la regla dura de `02_SMART_CONTRACT_SPEC.md`: "ninguna ruta de fondos sin salida"). No hay forma de que ese backer recupere su aporte una vez borrado el proyecto en ese estado.

**Decision tomada:** `deleteProject` solo se permite si `pledged == 0` (nunca hubo aportes, o todos los backers ya se reembolsaron) o `claimed == true` (el creador ya retiro el total; los backers que no se reembolsaron antes del claim ya perdieron esa via de todas formas, borrar despues no empeora nada). Se agrego el error `ProjectHasActiveFunds` para el caso bloqueado. Cubre el pedido de Abraham ("haya o no retirado los fondos") sin abrir el hueco de fondos bloqueados.

**Efecto secundario detectado y corregido:** tras un `delete`, `creator` vuelve a `address(0)` pero `id < nextProjectId` sigue siendo cierto, asi que `_requireProjectExists` no detecta el borrado por si solo — sin un chequeo extra, cualquiera podria seguir llamando `pledge(id)` sobre un proyecto "borrado" (quedaria con `creator == address(0)`, fondos nunca reclamables por nadie pero siempre reembolsables via `refund`, ya que `claimed` tambien vuelve a `false`: no hay perdida de fondos, pero si un estado fantasma confuso). Se corrigio extendiendo el chequeo existente de `pledge`: `if (projects[id].claimed || projects[id].creator == address(0)) revert ProjectClosed(id);`.

**Frontend:** boton "Eliminar proyecto" en `ProjectDetail.tsx`, visible solo si `isCreator && (project.claimed || project.pledged === 0n)` (mismo criterio que el contrato, no una heuristica distinta), con `window.confirm` por ser una accion irreversible. `useProjects.ts` (listado) filtra proyectos con `creator == address(0)` para no mostrar "proyectos fantasma". Nuevo hook `useDeleteProject.ts`, mismo patron que `useRefund.ts`/`useClaimFunds.ts` (gas explicito: 120_000n, sin interaction externa).

**Tests agregados:** `test/Crowdfunding.ts` § `deleteProject` — borrado exitoso (sin pledges y con `claimed`), revert `ProjectHasActiveFunds` con pledges activos (y se confirma que el backer igual puede hacer `refund` normalmente), borrado tras reembolso completo, revert `NotProjectCreator`/`ProjectNotFound`, y que un proyecto borrado ya no acepta `pledge` (`ProjectClosed`).

**IMPORTANTE — requiere redeploy:** este cambio modifica el bytecode de `Crowdfunding.sol` (nueva funcion, nuevo error, nuevo evento, chequeo extra en `pledge`). El contrato ya desplegado en Sepolia (`0x0C83FeC42a3A4fCc1eba99175aAE52EE16536396`) NO tiene `deleteProject` y seguira sin tenerlo hasta un nuevo deploy. Hardhat Ignition no redeploya si ya existe un journal completo para el mismo id de red — hay que forzar un `IGNITION_DEPLOYMENT_ID` nuevo (mismo bug ya documentado en `04_STATUS.md` § Sesion 2026-07-14, usar `IGNITION_DEPLOYMENT_ID`, no `DEPLOYMENT_ID`, para no colisionar con la deteccion de CI de `hardhat-keystore`):
```bash
IGNITION_DEPLOYMENT_ID=sepolia-v3 npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat verify --network sepolia <DIRECCION_NUEVA>
```
Despues, actualizar `frontend/.env` (`VITE_CROWDFUNDING_ADDRESS_SEPOLIA`) con la direccion nueva.
