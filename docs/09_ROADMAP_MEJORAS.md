# Roadmap de mejoras — subir la nota del proyecto

## Cómo usar este documento
- Cada punto trae **opciones con trade-offs**, nunca una solución ya decidida — el criterio es el mismo que `03_PLAN_FASES.md`: no ejecutar sin autorización explícita de Abraham.
- Al elegir una opción: completar la línea "Decisión" del punto.
- Al terminar la implementación: cambiar el Estado a `CERRADO (fecha) — <opción elegida> — <justificación técnica breve>`, igual que se hace en `04_STATUS.md`.
- Este documento es el único lugar donde se trackea el avance de estos 8 puntos — no duplicar el seguimiento en `04_STATUS.md` (que sigue siendo el changelog cronológico de sesiones); cuando un punto se cierre aquí, `04_STATUS.md` recibe una entrada de sesión normal como siempre.

## Contexto: de dónde sale este roadmap
Feedback de evaluación del proyecto (2026-07-19), inmediatamente después de cerrar la cobertura de tests de `frontend2.0/` (nota subió de 7/10 a 7.5/10, ver esa sesión en `04_STATUS.md`). Los 8 puntos de abajo son lo que falta identificado en esa evaluación, priorizados por impacto real, no por facilidad de implementación.

## Estado global

| # | Punto | Prioridad | Estado |
|---|---|---|---|
| 1 | CI (GitHub Actions) | 🔴 Crítico | CERRADO (2026-07-19) — Opción B+C híbrida |
| 2 | Deploy Base Sepolia (cierre real de Fase 3) | 🔴 Crítico | PENDIENTE — depende de Abraham (fondos testnet) |
| 3 | Tests de componentes reales (render con RTL) | 🟠 Alto | CERRADO (2026-07-20) — Opción A |
| 4 | Tests de `TxTrackerContext`/`useTxStatus` | 🟠 Alto | CERRADO (2026-07-20) — Opción B |
| 5 | Backend: estado en memoria → persistente | 🟡 Medio | CERRADO (2026-07-20) — Opción A |
| 6 | `documentCID` sin mostrar en `ProjectDetail` | 🟡 Medio | CERRADO (2026-07-20) — ya estaba implementado |
| 7 | Lighthouse / validación en dispositivo real | 🟡 Medio | PENDIENTE (ya documentado en 04/06/07) |
| 8 | README usuario final + doc técnica de arranque | 🟢 Bajo | CERRADO (2026-07-22) — Opción B |
| 9 | Redundancia de pinning IPFS (SPOF Pinata) | 🔴 Crítico | PLANIFICADO — ver §9, no ejecutado |
| 10 | Plan de contingencia post-deploy mainnet (sin pause/upgrade) | 🔴 Crítico | PLANIFICADO — ver §10, no ejecutado |
| 11 | Endurecer abuso del backend (rate limit por IP + moderación de contenido) | 🟠 Alto | CERRADO (2026-07-29) — Opciones A+C + tests (Vitest+Supertest, 15/15) |
| 12 | Tests E2E con wallet real (Playwright + Anvil) | 🟠 Alto | IMPLEMENTADO (2026-07-29) — variante sin Synpress, pendiente confirmación real de Abraham |
| 13 | Lighthouse CI: `warn` → `error` con línea base real | 🟡 Medio | PLANIFICADO — ver §13, no ejecutado |
| 14 | Análisis de UX del modelo sin `deadline` (riesgo de fondos "olvidados") | 🟡 Medio | PLANIFICADO — ver §14, no ejecutado |

---

## 1. CI (GitHub Actions) — 🔴 Crítico

### Por qué importa
Hoy hay 61 tests (38 Hardhat + 23 Vitest) y ninguna garantía de que se corran antes de mergear un cambio. Sin CI, la cobertura de tests es "buena voluntad", no una red de seguridad real.

### Opciones

**Opción A — CI mínimo, 2 jobs independientes**
- `.github/workflows/ci.yml` con `job: contracts` (`npm ci && npm test` en la raíz) y `job: frontend` (`npm ci && npm run test` en `frontend2.0/`), disparado en push/PR a cualquier rama.
- Sin cache de dependencias: más simple de mantener, un poco más lento en cada corrida (~1-2 min extra).
- **Costo:** ~15 líneas de YAML, cero mantenimiento adicional.

**Opción B — CI con cache + matrix de Node**
- Igual que A, más `actions/cache` para `node_modules`/`~/.npm` (corridas más rápidas) y matrix (ej. Node 20/22) para detectar incompatibilidades de versión temprano.
- **Costo:** YAML más largo (~40 líneas), justificado solo si las corridas empiezan a sentirse lentas o hay dudas de compatibilidad de Node entre máquinas.

**Opción C — CI + comentario automático de gas report en el PR**
- Además de A/B, un step que corre `npm run test:gas` y postea el resultado como comentario en el PR (ej. con `actions/github-script` o una action ya hecha como `gas-reporter` con `CI: true`).
- Relevante porque los límites de gas (350k/120k) son una restricción dura del cliente (`00_PROJECT_OVERVIEW.md`) — verlo en cada PR sin correr nada localmente.
- **Costo:** el más alto de las 3, pero es la única opción que convierte una restricción dura del cliente en algo visible sin esfuerzo manual.

### Decisión: **B+C híbrida** (2026-07-19)
Matrix Node 20/22 (de B, el `package.json` no fija versión de Node y Hardhat 3 +
toolbox-viem es reciente — detectar incompatibilidad temprano) + comentario
automático de gas report en el PR (de C, justificado porque 350k/120k es
restricción dura del cliente, no interna). Se descartó cache de dependencias
en el job `contracts` por ahora: con matrix de 2 versiones de Node, el
hashing de cache añade complejidad que no se justifica todavía en un repo
chico — se agrega si el CI se siente lento, no antes de tener ese dato real.
Implementado en `.github/workflows/ci.yml` (3 jobs: `contracts`, `gas-report`
condicionado a `pull_request`, `frontend`). Scripts usados verificados contra
los `package.json` reales (no de memoria): `compile`/`test`/`test:gas` en la
raíz, `test` (vitest run) en `frontend2.0`.

**Corrección post-implementación (mismo día):** el matrix real quedó en
`[22, 24]`, no `[20, 22]` como se diseñó originalmente — Hardhat 3.9.1 y
`@tanstack/react-start`/`pdfjs-dist` (en `frontend2.0`) exigen Node ≥22.12/
22.13. Detalle completo del debugging (incluida la causa raíz real del fallo
de lockfile de `frontend2.0`, no relacionada con Node): `04_STATUS.md` §
"Sesion 2026-07-19 (4)".

⚠️ **Advertencia para el futuro, no resuelta a proposito:** el lockfile de
`frontend2.0` (`package-lock.json`) solo quedó estable porque se regeneró con
`npm install` completo (no `--package-lock-only`). La mayoría de
`devDependencies`/`dependencies` de `frontend2.0/package.json` (scaffold de
Lovable, no tocado) usan rango `^` en vez de versión exacta — al contrario de
la convención propia del proyecto ("versiones exactas, sin `^`", ver
`04_STATUS.md`). Mientras el lockfile actual no se borre, `npm ci` sigue
siendo determinístico. Pero si en el futuro alguien borra
`package-lock.json` y lo regenera, una nueva versión publicada de cualquier
dependencia de `nitro`/`unstorage` (beta) puede volver a producir el mismo
error de lockfile desincronizado en CI — no es un bug que se "arregló
definitivamente", es un riesgo estructural que sigue latente mientras esas
dependencias no estén fijadas exactas. No se fijó ahora por ser scaffold de
Lovable fuera del alcance pedido.
### Estado: CERRADO (2026-07-19)

---

## 2. Deploy en Base Sepolia — cierre real de Fase 3 — 🔴 Crítico

### Por qué importa
Toda la arquitectura (`01_ARCHITECTURE.md` §3) está pensada para L2 (Base); hoy se opera en Ethereum Sepolia (L1) por falta de fondos testnet. Si Fase 6 (mainnet) hereda esa inercia, el costo por transacción para Claudio se dispara respecto a lo prometido en la propuesta original.

### Opciones (para conseguir ETH de Base Sepolia — la acción la ejecuta Abraham, no este asistente, ver `04_STATUS.md` § Fase 3)

**Opción A — Faucet oficial de Base**
- `portal.cdp.coinbase.com/products/faucet` (Coinbase Developer Platform) — requiere cuenta de Coinbase, sin costo.

**Opción B — Bridge manual desde Ethereum Sepolia**
- Si Abraham ya tiene ETH de Sepolia (usado para el deploy actual), puede puentearlo a Base Sepolia via `bridge.base.org` (testnet). Evita depender de un faucet con límites de cuota.

**Opción C — Faucet de terceros (Alchemy/QuickNode)**
- Alternativa si A/B están rate-limited; requiere cuenta en esos proveedores.

### Una vez con fondos (comandos ya documentados, sin cambios)
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
npx hardhat verify --network baseSepolia <DIRECCION>
```

### Decisión: _(pendiente — depende de disponibilidad de Abraham, no es una decisión técnica)_
### Estado: PENDIENTE

---

## 3. Tests de componentes reales (render con React Testing Library) — 🟠 Alto

### Por qué importa
Los 23 tests actuales de `frontend2.0/` son lógica pura extraída (`projectPermissions.ts`, `projectStatusLabel.ts`, `txErrors.ts`) y un hook con wagmi mockeado (`useProjects`) — ningún test monta un componente real y verifica el DOM con `render()`/`getByRole`. La lógica está protegida; el "¿aparece el botón correcto en pantalla?" no.

### Opciones

**Opción A — Happy-path por componente clave**
- Un test por componente (`ProjectCard`, `ProjectDetail`) que monta con `render()`, mockea `wagmi`/`useProjectMetadata` (react-query) con datos fijos, y confirma con `getByText`/`getByRole` que el botón correcto aparece según el estado (`canClaim`/`canRefund`/`canDelete`).
- Alcance acotado: 2 archivos nuevos, ~6-8 tests. Cubre el caso donde `ProjectDetail.tsx` deja de pasarle bien los props a `projectPermissions.ts` (bug de integración, no de lógica).

**Opción B — Cobertura ampliada incluyendo formularios**
- Además de A, tests de `CreateProjectForm`/`PledgeForm` con `@testing-library/user-event` (ya está en `package.json`, sin usar aún) simulando click/type real, mockeando `usePinataUpload`/`useCreateProject`.
- Mayor cobertura, pero estos componentes tienen más dependencias que mockear (IPFS auth, gas estimado) — más esfuerzo de mantenimiento por test.

**Opción C — Snapshot testing**
- `expect(container).toMatchSnapshot()` en vez de aserciones explícitas.
- **No recomendado como única estrategia:** un snapshot roto por cualquier cambio de estilo/copy genera ruido (falsos positivos) sin decirte si el bug es real — es rápido de escribir pero barato en señal. Mencionado por completitud, no como opción preferente.

### Decisión: **Opción A — happy-path por componente clave** (2026-07-20)
Se descartó B (formularios) por ahora: `CreateProjectForm`/`PledgeForm` dependen de IPFS auth y gas estimado, más superficie de mocks por poco beneficio adicional frente al riesgo real ya cerrado. Se descartó C (snapshots) por bajo valor de señal, igual que ya advertía este mismo documento.

Implementado en `frontend2.0/src/components/ProjectCard.test.tsx` (4 tests: título/imagen real vs. fallback de inicial, pill "Withdrawn", click dispara `onSelect`) y `ProjectDetail.test.tsx` (5 tests: loading, creador ve solo Claim con el pledge form aún abierto, backer con pledge ve solo Refund nunca Claim, creador tras claim ve Delete y el pledge form se oculta, red no soportada oculta todos los botones de acción). Todos los hooks (`useProject`, `useProjectMetadata`, `useProjectStatus`, `useNetworkStatus`, `useClaimFunds`, `useRefund`, `useDeleteProject`, `useAccount`) se mockean con `vi.mock`; `lib/projectPermissions.ts` se deja real (ya tenía cobertura unitaria, esto prueba que `ProjectDetail.tsx` le pasa los props correctos — el bug real de la sesión 2026-07-14 fue justo ahí, en la integración, no en la lógica pura). `PledgeForm` se stubea como componente hijo para no arrastrar `usePledge`/`useWriteContract` real.
### Estado: CERRADO (2026-07-20)

---

## 4. Tests de `TxTrackerContext`/`useTxStatus` — 🟠 Alto

### Por qué importa
Es la pieza que resolvió el bug de lifecycle más serio del proyecto (componentes que se desmontan y pierden el resultado de una tx, ver `04_STATUS.md` § arquitectura de tx tracking). Hoy no tiene ningún test — si se rompe en un refactor futuro, nada avisa.

### Opciones

**Opción A — Test de la lógica de estado en aislamiento**
- Extraer/testear el reducer o las funciones puras de `TxTrackerContext.tsx` (transición `pending → confirming → success/error`, persistencia del hash en `localStorage`) sin montar el provider completo.
- Más barato, pero no prueba la integración real con `useWaitForTransactionReceipt`.

**Opción B — Test de integración: provider + consumidor mockeando wagmi**
- Montar `TxTrackerProvider` con un componente hijo de prueba, mockear `useWaitForTransactionReceipt` de wagmi para simular una tx que confirma o revierte, y verificar que `useTxStatus` refleja el estado correcto — incluyendo el caso de unmount/remount (el bug original) simulando que el componente que trackea la tx se desmonta a mitad de camino.
- Cubre el escenario real que causó el bug; más esfuerzo de mock (wagmi + react-query + localStorage con guard SSR).

**Opción C — Aceptar el riesgo por ahora, documentar como pendiente explícito**
- No implementar todavía; dejar registrado aquí como deuda conocida en vez de cobertura falsa con un test superficial que no prueba el caso real.

### Decisión: **Opción B — integración provider + consumidor, incluyendo unmount/remount** (2026-07-20)
Se descartó A (lógica en aislamiento) porque no habría probado la garantía real que esta arquitectura promete: que un componente puede desmontarse a mitad de una tx y el resultado no se pierde. Probar solo el reducer sin el ciclo de vida real habria dado falsa confianza — exactamente el riesgo que `05_CRITICAL_REVIEW.md`/`04_STATUS.md` ya documentaron como el bug mas serio del proyecto. Se descarto C (aceptar el riesgo) por ser la pieza de mayor impacto real sin ningun test.

Implementado en `frontend2.0/src/context/TxTrackerContext.test.tsx` (5 tests, `wagmi.useWaitForTransactionReceipt`/`usePublicClient` mockeados, `@/lib/txErrors` mockeado para aislar la logica propia del provider): confirming→success, **el escenario central: un `Consumer` se desmonta a mitad de tx, `TxTrackerProvider` sigue resolviendola sola, un `Consumer` nuevo montado despues ve el resultado ya resuelto sin volver a llamar `track()`**, persistencia/limpieza en `localStorage`, rehidratacion de un hash pendiente al montar (con un `Reader` que nunca llama `track()`, para probar que el dato viene realmente del `useState` inicial), y resolucion de error via eth_call replay. `frontend2.0/src/hooks/useTxStatus.test.ts` (5 tests) cubre el adaptador por separado: idle sin hash, error de wallet (`writeError`) con prioridad sobre cualquier estado ya trackeado, registro del hash en el tracker, estado `confirming` mientras no hay resolucion, y passthrough del estado/mensaje ya resuelto.
### Estado: CERRADO (2026-07-20)

---

## 5. Backend: estado en memoria → persistente — 🟡 Medio

### Por qué importa
`nonceStore`/`sessionStore`/rate limiter son `Map` de Node (ya documentado como limitación conocida en `04_STATUS.md` § "Autenticacion por wallet"): se resetean en cada restart y no escalan a más de una instancia. Mientras el backend siga siendo el único guardián del JWT de Pinata, esto es riesgo real si el backend sale de `localhost`.

### Opciones

**Opción A — SQLite (`better-sqlite3`), archivo local**
- Sin infraestructura externa nueva; sobrevive a un restart del proceso. Encaja con el criterio del proyecto de "backend mínimo, no una pieza de infraestructura pesada" (`00_PROJECT_OVERVIEW.md`).
- Límite: sigue sin ser compartido entre múltiples instancias del backend (si algún día se escala horizontalmente).

**Opción B — Redis**
- Estándar de la industria para nonces/sesiones/rate limiting con TTL nativo; sí soporta múltiples instancias.
- Requiere una pieza de infraestructura nueva (servicio Redis corriendo), lo cual es más de lo que el backend necesita hoy para su volumen real (cuota de Pinata de 1 use/IP/día).

**Opción C — No tocar todavía, documentar como riesgo aceptado**
- Válido mientras el backend corra en una sola instancia en `localhost` (estado actual real) — coherente con "no añadir complejidad sin necesidad técnica real", mismo criterio ya aplicado en otras decisiones del proyecto (`06_FRONTEND_VISUAL_UPGRADE.md` §2).

### Decisión: **Opción A — SQLite (`better-sqlite3`)** (2026-07-20)
Se descartó B (Redis) por ser infraestructura nueva sin necesidad real: el volumen actual es 1 subida/IP/ventana, un solo proceso en `localhost`. Se descartó C (no tocar) porque ya había una opción barata (A) que cierra el riesgo real (perder nonces/sesiones activas en cada restart del backend durante desarrollo) sin agregar una pieza de infraestructura nueva que correr.

Implementado: `backend/src/db.ts` (nuevo, un solo archivo `backend/data/backend.sqlite`, `journal_mode = WAL`, crea las 3 tablas si no existen, limpieza peridica cada 5 min de filas expiradas via `setInterval(...).unref()`). `nonceStore.ts`/`sessionStore.ts`/`rateLimiter.ts` reescritos para usar SQLite en vez de `Map`, **misma API publica exacta** (mismas firmas de función) — `index.ts`/`auth.ts` no necesitaron ningún cambio. Nueva dependencia `better-sqlite3@12.11.1` (+ `@types/better-sqlite3@7.6.13`), versiones exactas verificadas en npmjs.com el mismo dia. `backend/data/` agregado a `.gitignore` (mismo criterio que `node_modules`: es estado local generado, no fuente).

**Limitacion que se mantiene, documentada a proposito:** sigue sin ser compartido entre múltiples instancias del backend (si algun dia se escala horizontalmente, hace falta Redis u otro store compartido — la Opcion B descartada aqui). Aceptable mientras el backend corra como un unico proceso, que es el estado real actual.
### Estado: CERRADO (2026-07-20)

---

## 6. `documentCID` sin mostrar en `ProjectDetail` — 🟡 Medio

### Por qué importa
Pendiente desde el cierre de Fase 5 (`03_PLAN_FASES.md`): el documento adjunto se sube a IPFS correctamente, pero no hay UI que lo muestre/enlace en la vista de detalle.

*Nota: revisar si esto sigue siendo cierto — la sesión "Fix (2026-07-16)" de `04_STATUS.md` menciona un link "ver documento adjunto" en `ProjectDetail.tsx` vía `useProjectMetadata`. Confirmar contra el código real antes de decidir la opción; puede que este punto ya esté cerrado y solo falte actualizar el checklist de `03_PLAN_FASES.md`.*

### Opciones (si tras confirmar sigue pendiente)

**Opción A — Link simple**
- Igual patrón que el link de "ver JSON crudo" ya existente: `<a href={documentUrl}>ver documento adjunto</a>`.

**Opción B — Preview enriquecido**
- Mostrar nombre/tipo de archivo, y si es PDF, una miniatura de la primera página (reutilizando `pdfjs-dist`, ya instalado para `documentText.ts`).
- Más trabajo, valor cuestionable para un adjunto que de todos modos se abre en pestaña nueva.

### Decisión: ya resuelto — no aplica elegir opción A/B (2026-07-20)
Confirmado contra `frontend2.0/src/components/ProjectDetail.tsx` real: ya renderiza `documentUrl` (de `useProjectMetadata`) como link `"view attached document"`, junto al link de `"view raw JSON"` — mismo patrón que la Opción A de este punto, implementado en la sesión "Fix (2026-07-16)" (`04_STATUS.md`). Este punto del roadmap quedó desactualizado respecto al código; no requirió ningún cambio nuevo, solo actualizar el checklist.
### Estado: CERRADO (2026-07-20) — ya estaba implementado, sin acción nueva

---

## 7. Lighthouse / validación en dispositivo real — 🟡 Medio

### Por qué importa
El Hero/marquee tiene requisitos duros documentados (60fps, `prefers-reduced-motion`, Lighthouse ≥95, ver `06_FRONTEND_VISUAL_UPGRADE.md` §9.4) que nunca se midieron — todo el trabajo de performance es teórico hasta correr `npm run build && npm run preview` y medir.

### Opciones

**Opción A — Medición manual puntual**
- Abraham corre `npm run build && npm run preview` localmente + Lighthouse en Chrome DevTools una vez, documenta el resultado en `06_FRONTEND_VISUAL_UPGRADE.md` §9.5.
- Más rápido, pero es una foto única — no detecta regresiones futuras.

**Opción B — Lighthouse CI automatizado**
- Agregar `@lhci/cli` como step del pipeline de CI (punto 1 de este roadmap) contra el build de preview, con umbrales configurados (≥95) que fallan el CI si se regresiona.
- Requiere que el punto 1 (CI) ya exista; es la opción que de verdad protege contra regresiones a futuro, no solo confirma el estado actual.

### Decisión: _(pendiente)_
### Estado: PENDIENTE

**Hallazgo (2026-07-21):** Lighthouse CLI y el panel de DevTools fallan con `NO_FCP` en esta máquina específica (WSL), en cualquier modo (headless, headed, con/sin sandbox/GPU). Confirmado con Chrome DevTools Performance (CPU 4x + Slow 4G + incógnito) que la página **sí pinta correctamente** bajo esas mismas condiciones — descarta un bug real de la app. Es un problema del runner de Lighthouse en este entorno, no del código. De paso se corrigieron 2 issues reales encontrados durante la investigación (válidos independientemente de esto):
- `Hero.tsx`/`styles.css`: el primer fold usaba `.reveal` (opacity:0 hasta que un `IntersectionObserver` dispara post-hidratación) — contenido ya visible sin scroll no debe depender de JS para pintarse. Nueva variante `.reveal-immediate` (animación CSS pura) para above-the-fold.
- `routes/index.tsx`: `DemoSection` (que monta wagmi/viem/`AppShell`) se importaba de forma estática, metiendo todo el bundle de la dApp en el chunk crítico de la landing (349KB → ahora separado y lazy-loaded, `routes-*.js` bajó a 23KB).

Medir Performance/SEO real ahora requiere: Lighthouse CI (Opción B de este punto, corre en GitHub Actions con Chrome bien configurado) o PageSpeed Insights contra una URL pública una vez exista deploy.

### Fix (2026-07-27): 2 bugs reales de CI encontrados corriendo el primer PR real

Abraham corrio el primer PR real contra este workflow. Dos jobs fallaron — no por el bug de WSL ya documentado arriba, sino por 2 problemas nuevos y reales del propio `ci.yml`:

1. **`gas-report` — 403 al comentar en el PR:** el workflow no declaraba `permissions:`, asi que el `GITHUB_TOKEN` por defecto (read-only en repos nuevos) no alcanzaba para `github.rest.issues.createComment(...)`. Fix: se agrego `permissions: { contents: read, pull-requests: write }` al job.
2. **`lighthouse` — `NO_FCP` real, causa distinta al hallazgo de WSL:** el log muestra `WARNING: Timed out waiting for the server to start listening` **antes** de que `npm run preview` imprimiera `Local:` (se ve en el mismo log, unos segundos despues). Se subio `startServerReadyTimeout` a 60s y el mismo error persistio identico (ver siguiente parrafo) — **causa real confirmada**: `npm run preview` pasa por el wrapper de npm, que bufferea el stdout del proceso hijo en un entorno sin TTY (como un runner de CI); Node no hace line-buffering ahi, asi que LHCI nunca ve la linea `Local:` en tiempo real, sin importar el timeout configurado — le llega toda de golpe recien cuando el buffer se vacia. Fix real: `startServerCommand` cambiado de `"npm run preview"` a `"npx vite preview --port 4173"` (llama al binario de Vite directo, sin el wrapper de npm en el medio). `startServerReadyTimeout: 60000` se mantiene como red de seguridad adicional, no como el fix principal.

### Implementado (2026-07-21): job `lighthouse` en `.github/workflows/ci.yml`
Nuevo job, solo en `pull_request` (mismo patrón que `gas-report`): `npm ci` + `npm run build` en `frontend2.0`, luego `npx @lhci/cli@0.15.1 autorun` (versión verificada en npmjs.com el mismo día). `@lhci/cli` levanta `npm run preview` él mismo (`.lighthouserc.json` § `startServerCommand`) y corre Lighthouse contra ese servidor **dentro del runner de GitHub** — Chrome headless de un Ubuntu limpio, sin el problema de esta máquina.

`frontend2.0/.lighthouserc.json`: umbrales de Performance/Accessibility/SEO en **`warn`, no `error`** (0.9 mínimo) — a propósito, porque nunca se consiguió un reporte real local para confirmar una línea base; una vez Abraham revise el primer resultado real en un PR, subir a `error` si los números lo justifican. `numberOfRuns: 1` (no 3-5 como recomienda LHCI para reducir varianza) para mantener el job rápido; reconsiderar si los resultados son inconsistentes entre corridas.

**No se implementó** subir resultados a un dashboard propio de LHCI (servidor de LHCI) — `upload.target: "temporary-public-storage"` usa el storage temporal público de Google (gratis, sin infraestructura propia), consistente con "backend mínimo" del proyecto.
### Estado: CERRADO (2026-07-21) — Lighthouse local sigue roto en esta máquina (ver hallazgo arriba), pero deja de ser un bloqueante: la medición real ahora vive en CI.

---

## 8. README usuario final + doc técnica de arranque — 🟢 Bajo

### Por qué importa
Último ítem del checklist de Fase 6 (`03_PLAN_FASES.md`) sin empezar — es lo que falta para que el repo sea autoexplicativo para alguien nuevo (incluye a Claudio, el cliente no técnico).

### Opciones

**Opción A — Esperar a Fase 6 como está planeado**
- No adelantar: `03_PLAN_FASES.md` ya condiciona Fase 6 a autorización explícita de Abraham y a que Fase 3 (Base Sepolia) cierre primero — coherente con la regla del proyecto de no avanzar de fase sin autorización.

**Opción B — Adelantar solo el README técnico (no el de usuario final)**
- Un `README.md` mínimo en la raíz con "cómo levantar el proyecto localmente" (contratos + frontend + backend) ahora, sin esperar a Fase 6 — útil independientemente de en qué red esté desplegado, y no compite con el trabajo pendiente de Fase 3/6.
- El README para Claudio (no técnico) sí queda para Fase 6, porque depende de la red final de producción (URLs, direcciones de contrato reales).

### Decisión: **Opción B — solo README técnico** (2026-07-22)
El README de usuario final para Claudio sigue sin sentido hoy: depende de URLs/direcciones de una red de producción que todavía no existe (Fase 6 no autorizada). El técnico no tiene esa dependencia y ya era el hueco real (nadie nuevo podía levantar el repo sin leer los 10 docs).

Implementado: `README.md` en la raíz (contratos, backend, frontend2.0, CI, links a `docs/`). Se detectó y corrigió un hueco real al escribirlo: `backend/.env` existe pero `backend/.env.example` **no existía en el repo** (solo se mencionaba en `04_STATUS.md`) — el comando `cp .env.example .env` documentado ahí nunca hubiera funcionado. Se creó `backend/.env.example` (mismas claves que `backend/.env`, sin el JWT real).
### Estado: CERRADO (2026-07-22) — Opción B

---

# Revisión crítica adicional (2026-07-28)

Origen: evaluación de puntuación del proyecto completo (no un feedback de Abraham sobre una tarea puntual, sino una auditoría transversal pedida por Abraham sobre el estado actual de todos los docs). Se identificaron 6 huecos que **no estaban** en el roadmap original del 2026-07-19 porque son de una naturaleza distinta: no son "falta cobertura de test" o "falta infraestructura menor", son riesgos de **producto/continuidad** que un checklist de fases no captura por sí solo.

**Regla de esta sección, explícita a pedido de Abraham:** documentar y planificar primero, no ejecutar nada todavía. Cada punto de abajo trae un plan paso a paso listo para correr cuando Abraham autorice, con sus tests obligatorios y sus entregables mínimos de cierre — mismo criterio que ya usa este documento (`09_ROADMAP_MEJORAS.md` no es una fase secuencial, se activa bajo demanda).

---

## 9. Redundancia de pinning IPFS (SPOF Pinata) — 🔴 Crítico

### Por qué importa
`05_CRITICAL_REVIEW.md` ya documenta que la cuenta de Pinata es del plan gratuito (1 GB). Lo que **no** está documentado en ningún doc del proyecto: qué pasa si Pinata da de baja el contenido, sufre una caída prolongada, o la cuenta se suspende (ej. por abuso de cuota vía el hueco del punto 11). En ese escenario, **toda imagen/descripción/documento de cada campaña existente desaparece de la UI** — el CID sigue siendo válido on-chain, pero no hay ningún nodo que sirva esos bytes. Esto contradice el argumento de venta de "descentralizado" (`00_PROJECT_OVERVIEW.md`): la capa de fondos es descentralizada, la capa de metadata hoy depende de un único proveedor gratuito sin backup.

### Opciones

**Opción A — Pin dual: Pinata + web3.storage (Storacha) en paralelo**
- El backend (`backend/src/pinata.ts`) sube a ambos proveedores en la misma request; se guarda un CID (el estándar IPFS CIDv1 debería coincidir entre proveedores si el contenido es idéntico, verificar esto en la prueba de concepto del paso 1 de abajo).
- **Costo:** requiere una segunda cuenta/API key, y doblar el tiempo de subida (dos requests HTTP en vez de una) — mitigable con `Promise.allSettled` para no bloquear si uno de los dos falla.
- **Beneficio:** si Pinata cae, el gateway de web3.storage (o cualquier gateway público) sigue sirviendo el mismo CID sin cambiar nada on-chain ni en el frontend.

**Opción B — Solo verificación periódica + alerta (sin segundo proveedor)**
- Un script (`scripts/check-pins.ts`) que recorre todos los `metadataCID` on-chain (via `getProject`) y confirma que Pinata todavía los sirve (`HEAD` al gateway), corriendo como job de CI o cron.
- **Costo:** bajo, no requiere segunda cuenta.
- **Beneficio:** detecta el problema temprano, pero **no lo resuelve** — si Pinata efectivamente pierde el contenido, esto solo avisa, no restaura nada.

**Opción C — Node IPFS propio (self-hosted) como tercer pin**
- Correr un nodo Kubo propio que haga `pin add` de cada CID como backup adicional a A.
- **Costo:** el más alto — infraestructura nueva a mantener (exactamente lo que `00_PROJECT_OVERVIEW.md` pide evitar: "backend mínimo, no una pieza de infraestructura pesada"). Se descarta salvo que A+B resulten insuficientes en la práctica.

### Recomendación (a decidir por Abraham, no ejecutada)
**A + B combinadas**: pin dual como mitigación real, más el script de verificación como red de alerta temprana — ninguna de las dos por sí sola cierra el riesgo completo (A sin B no avisa si *ambos* proveedores fallan; B sin A solo avisa sin resolver).

### Plan de ejecución paso a paso (cuando se autorice)
1. **Prueba de concepto aislada** (sin tocar el backend real): subir un archivo de prueba a Pinata y a web3.storage/Storacha por separado, confirmar si el CID resultante es idéntico (debería serlo si ambos usan CIDv1 default con el mismo hash — **verificar esto empíricamente antes de construir nada**, es el supuesto que sostiene toda la opción A).
2. Crear cuenta + API key de web3.storage con scope restringido (mismo criterio ya aplicado a Pinata en `05_CRITICAL_REVIEW.md`: solo permisos de subida, no de administración).
3. `backend/src/storacha.ts` (nuevo, mismo patrón que `pinata.ts`): funciones `pinFileToStoracha`/`pinJSONToStoracha`.
4. Modificar `backend/src/index.ts`: en `/api/pin-file` y `/api/pin-json`, disparar ambas subidas en paralelo (`Promise.allSettled`), devolver éxito si **al menos una** tuvo éxito, loguear (no fallar la request) si una de las dos falla.
5. `scripts/check-pins.ts` (nuevo, raíz del repo, corre con `tsx`): lee todos los proyectos on-chain, hace `HEAD` a `gateway.pinata.cloud/ipfs/<cid>` y a un gateway público de web3.storage para cada `metadataCID`, imprime un reporte de CIDs no accesibles en ninguno de los dos.
6. Job nuevo en `.github/workflows/ci.yml` (`ipfs-health-check`, cron semanal via `schedule:`, no en cada push) que corre el script del paso 5 y falla/notifica si algún CID quedó huérfano.

### Tests requeridos
- Test unitario de `storacha.ts` con `fetch` mockeado (éxito, fallo, timeout) — mismo patrón que ya existe para `pinata.ts` si lo tiene, o nuevo si no.
- Test de integración del endpoint `/api/pin-file` simulando: (a) ambos proveedores OK, (b) Pinata falla/web3.storage OK, (c) al revés, (d) ambos fallan → debe devolver error solo en el caso (d).
- Test de `check-pins.ts` con un mock de `getProject`/`fetch` que incluya al menos un CID "huérfano" simulado, confirmando que el script lo reporta.

### Entregables mínimos para considerar este punto CERRADO
- [ ] POC de CID idéntico entre proveedores confirmada o documentado el ajuste necesario si no coinciden.
- [ ] `backend/src/storacha.ts` + modificación de `index.ts` con pin dual funcionando.
- [ ] `scripts/check-pins.ts` corriendo manualmente contra los proyectos reales de Sepolia con reporte limpio.
- [ ] Job de CI de verificación semanal en verde.
- [ ] Entrada de cierre en este documento + `04_STATUS.md` con el resultado real de la POC del paso 1 (no asumido).

### Decisión: _(pendiente de autorización de Abraham)_
### Estado: PLANIFICADO — no ejecutado

---

## 10. Plan de contingencia post-deploy en mainnet (sin pause/upgrade) — 🔴 Crítico

### Por qué importa
`02_SMART_CONTRACT_SPEC.md` documenta correctamente que el contrato **no tiene** `onlyOwner`/pausa, a propósito, para evitar que el propio equipo pueda hacer un "rug pull" — decisión correcta y bien justificada para la fase de testnet. El hueco real es otro: **no existe ningún documento que describa qué hacer si aparece un bug crítico después del deploy en mainnet, con fondos reales de Claudio y sus backers ya depositados.** Hoy la única respuesta implícita en los docs es "deployar de nuevo" (`05_CRITICAL_REVIEW.md`, redeploys de `deleteProject`), pero eso no migra los fondos ya bloqueados en el contrato viejo — cada redeploy documentado hasta ahora fue en testnet, sin fondos reales en juego, y el proceso no es directamente aplicable a mainnet sin un plan de migración de fondos.

### Opciones

**Opción A — Runbook de incidentes (sin cambiar el contrato)**
- Documento nuevo `docs/10_INCIDENT_RUNBOOK.md`: pasos exactos si se detecta un bug crítico post-mainnet — cómo comunicar a los backers que dejen de aportar al contrato viejo, cómo coordinar que reclamen `refund` antes de que el creador haga `claimFunds`, cómo desplegar el contrato corregido y migrar campañas activas manualmente (recreándolas en el contrato nuevo con el mismo `metadataCID`).
- **Costo:** solo tiempo de documentación, cero cambio de código/arquitectura. No resuelve fondos ya reclamados (`claimed == true`) antes de detectarse el bug — eso queda fuera del alcance de cualquier opción, es una limitación inherente a un contrato sin custodia de terceros.

**Opción B — Auditoría externa profesional antes de mainnet**
- Contratar una auditoría de terceros (no Slither automatizado, sino revisión humana) antes del deploy en mainnet — reduce la probabilidad de necesitar el runbook del punto A, no la reemplaza.
- **Costo:** el más alto de las 3 (dinero real, fuera del control de este asistente) — decisión de negocio de Abraham/Claudio, no técnica.

**Opción C — Mecanismo de pausa temporal limitado (cambio de contrato)**
- Agregar un `Pausable` de OZ **solo sobre `createProject`/`pledge`** (nunca sobre `refund`/`claimFunds`, que deben seguir disponibles siempre — ver la regla dura ya existente "ninguna ruta de fondos sin salida", `00_PROJECT_OVERVIEW.md`), controlado por una multisig (no una EOA única) para reducir el riesgo de que la propia pausa sea el vector de rug-pull.
- **Costo:** el más alto en riesgo de diseño — cualquier `onlyOwner`/rol privilegiado reintroduce parcialmente el problema que el modelo actual evita a propósito. Requiere re-análisis de seguridad completo (Slither + revisión manual) porque cambia la superficie de ataque del contrato ya cerrado en Fase 2.

### Recomendación (a decidir por Abraham, no ejecutada)
**A como mínimo obligatorio antes de cualquier deploy en mainnet** (es documentación pura, sin trade-off real que discutir). B es una decisión de presupuesto de Claudio. C se descarta salvo que A+B no den suficiente confianza — cambia la garantía central del contrato ("nadie puede bloquear fondos permanentemente ni un admin") y no debería tomarse a la ligera.

### Plan de ejecución paso a paso (solo Opción A, la que no requiere decisión de negocio externa)
1. Mapear los escenarios de fallo posibles contra las funciones reales del contrato: bug en `pledge` (afecta futuros aportes), bug en `claimFunds` (afecta creadores con `isSuccessful==true` sin reclamar), bug en `refund` (afecta backers de proyectos no exitosos), bug en `deleteProject`.
2. Para cada escenario, documentar en `docs/10_INCIDENT_RUNBOOK.md`: cómo detectarlo (monitoreo de eventos on-chain, alertas), a quién notificar y cómo (Abraham → Claudio → backers, canal de comunicación), y la secuencia exacta de acciones (ej. "instruir a todos los backers a llamar `refund` antes de que el creador llame `claimFunds`" si el bug está en el cálculo de `pledged`).
3. Definir el proceso de migración manual: script `scripts/migrate-projects.ts` que lea todos los proyectos activos del contrato viejo (`getProject` en loop) y genere las llamadas `createProject` equivalentes para el contrato nuevo, preservando `metadataCID` (los fondos NO se migran automáticamente — deben ser reclamados/reembolsados en el contrato viejo primero, esto solo recrea el registro de campañas).
4. Checklist de "iniciar registro de incidente": campos mínimos a loguear (fecha, función afectada, tx hash del bug, monto de fondos en riesgo, decisión tomada).

### Tests requeridos
- No aplica test de código nuevo para la Opción A (es documentación). Si en el futuro se implementa el script de migración del paso 3, ese sí requiere: test simulando 3+ proyectos con distintos estados (`claimed`, con pledges activos, borrado) y confirmando que el script solo migra los proyectos elegibles, sin intentar migrar fondos.

### Entregables mínimos para considerar este punto CERRADO
- [ ] `docs/10_INCIDENT_RUNBOOK.md` con los 4+ escenarios de fallo mapeados y su secuencia de respuesta.
- [ ] Decisión explícita de Abraham/Claudio sobre Opción B (auditoría externa), documentada aunque la decisión sea "no, por ahora".
- [ ] Decisión explícita de Abraham sobre si C se evalúa alguna vez o queda descartada permanentemente (documentar el motivo).
- [ ] Script de migración (si se decide implementarlo) probado contra Sepolia con al menos un proyecto real migrado de punta a punta.

### Decisión: _(pendiente de autorización de Abraham)_
### Estado: PLANIFICADO — no ejecutado

---

## 11. Endurecer abuso del backend (rate limit por IP + moderación de contenido) — 🟠 Alto

### Por qué importa
`04_STATUS.md` § "Autenticación por wallet" ya documenta como limitación conocida que el rate-limit por IP es trivial de evadir (VPN, múltiples firmas de wallets distintas — la firma prueba control de una wallet, no identidad única, así que un atacante puede generar wallets nuevas sin costo). Hueco adicional **no documentado en ningún doc**: el backend no valida el *contenido* de lo que sube, solo el MIME type y tamaño (`05_CRITICAL_REVIEW.md`) — nada impide que alguien suba contenido ilegal o abusivo dentro de un PDF/imagen válido, quedando pineado permanentemente bajo la cuenta de Pinata de Abraham (riesgo legal/reputacional real, no solo de cuota).

### Opciones

**Opción A — Rate limit por wallet + IP combinado (no solo IP)**
- `rateLimiter.ts` ya tiene la sesión asociada a una `address` verificada por firma (`useIpfsAuth.ts`); combinar el límite por IP (ya existe) con un límite adicional por `address` — sube el costo de abuso (generar wallet nueva es gratis, pero cada wallet nueva sigue contando contra el límite de IP si es la misma persona/máquina).
- **Costo:** bajo, es extender la tabla `quota_usage` de SQLite (ya migrada en el punto 5 cerrado) con una columna `address` además de `ip`.

**Opción B — Proof-of-work o CAPTCHA antes de emitir sesión**
- Agregar un desafío (ej. `hCaptcha`, o un PoW ligero tipo `hashcash`) en `/api/auth/verify`, encareciendo la automatización de wallets nuevas.
- **Costo:** UX más fricción para usuarios legítimos; CAPTCHA de terceros añade una dependencia externa nueva (a evaluar contra el criterio de "backend mínimo").

**Opción C — Reporte/flag manual + revisión periódica (sin bloqueo automático de contenido)**
- No hay forma automática confiable de "moderar contenido" sin un servicio de terceros (ej. escaneo de imágenes) que excede el alcance de un backend mínimo. En su lugar: script `scripts/audit-uploads.ts` que liste todos los CIDs subidos en las últimas 24h para revisión manual de Abraham, y un mecanismo de "unpin" de emergencia (`DELETE` administrativo, protegido con una clave separada del `PINATA_JWT` normal) para retirar contenido reportado.
- **Costo:** requiere trabajo manual continuo de Abraham; no previene la subida, solo permite reaccionar rápido.

### Recomendación (a decidir por Abraham, no ejecutada)
**A siempre** (barato, cierra un hueco real sin fricción de UX). **C como mínimo de gobernanza** (necesitas *algún* mecanismo de retiro de emergencia antes de exponer el backend fuera de `localhost`, que ya está marcado como pendiente en `05_CRITICAL_REVIEW.md`). B se evalúa solo si A+C no bastan en la práctica — es la opción con más fricción de usuario.

### Plan de ejecución paso a paso (cuando se autorice)
1. `backend/src/db.ts`: agregar columna `address TEXT` a la tabla `quota_usage` existente (SQLite, `ALTER TABLE` o migración simple ya que la tabla se crea con `CREATE TABLE IF NOT EXISTS`).
2. `rateLimiter.ts`: nueva función `checkAndConsumeQuota(ip, address)` que verifica *ambos* límites (falla si cualquiera de los dos está agotado), sustituyendo la firma actual que solo recibe `ip`.
3. `auth.ts`: pasar la `address` ya verificada (viene del flujo de firma existente) al rate limiter en el momento de `verify`.
4. Implementar endpoint administrativo `POST /api/admin/unpin` (protegido con un header `X-Admin-Key` distinto de cualquier credencial de usuario, guardado también vía variable de entorno separada) que llame al `unpin` de Pinata para un CID dado.
5. `scripts/audit-uploads.ts`: lee `quota_usage`/logs del backend de las últimas 24h, imprime lista de CIDs + wallet que los subió, para revisión manual.
6. Documentar en `README.md`/`backend/.env.example` la nueva variable `ADMIN_UNPIN_KEY`.

### Tests requeridos
- Test de `checkAndConsumeQuota`: agotar por IP con direcciones distintas (debe bloquear), agotar por address con IPs distintas (debe bloquear), caso normal con cupo disponible en ambos (debe permitir).
- Test del endpoint `/api/admin/unpin`: sin header → 401; con header incorrecto → 401; con header correcto → llama a la función de unpin de Pinata (mockeada) y devuelve 200.
- Test de `audit-uploads.ts` contra una base SQLite de prueba con datos sembrados.

### Entregables mínimos para considerar este punto CERRADO
- [ ] Rate limit combinado IP+address funcionando y testeado.
- [ ] Endpoint de unpin de emergencia funcionando, documentado, con su propia credencial separada.
- [ ] Script de auditoría corrido al menos una vez contra datos reales de Sepolia/desarrollo.
- [ ] Documentación en `README.md` de cómo Abraham usa el unpin en caso de necesitarlo.

### Decisión: A + C, autorizado y ejecutado (2026-07-29)

Implementado en /backend tal como se planifico, con un ajuste de diseno real detectado al escribir el codigo (documentado abajo):

- backend/src/db.ts: en vez de agregar una columna address a la tabla quota_usage existente (plan original paso 1), se creo una tabla nueva quota_usage_address con la misma forma. Motivo: quota_usage tiene ip como PRIMARY KEY, una columna address bolted-on ahi habria forzado un indice secundario o dejado que dos wallets distintas detras de la misma IP compartieran un solo contador. Dos tablas independientes mantienen ambas dimensiones separadas; la logica de combinarlas vive en un solo lugar (rateLimiter.ts). Tambien se agregaron upload_log (auditoria de que CID subio que wallet) y admin_actions (auditoria del propio endpoint de unpin), necesarias para que el script del paso 5 y la gobernanza del paso 4 tuvieran algo real que leer.
- backend/src/rateLimiter.ts: reescrito, hasQuota(ip, address)/consumeQuota(ip, address) en vez de hasQuota(ip)/consumeQuota(ip). Bloquea si cualquiera de los dos limites esta agotado.
- backend/src/auth.ts: requireAdminKey (nuevo), compara el header X-Admin-Key contra ADMIN_UNPIN_KEY (variable separada, nunca reutiliza PINATA_JWT ni un token de sesion de wallet).
- backend/src/pinata.ts: unpinFromIPFS(cid) (nuevo), llama a DELETE /pinning/unpin/<cid> de Pinata.
- backend/src/auditLog.ts (nuevo): logUpload/listUploadsSince (tabla upload_log) y logAdminAction (tabla admin_actions).
- backend/src/index.ts: /api/auth/verify llama hasQuota(ip, address)/consumeQuota(ip, address); /api/pin-file y /api/pin-json registran cada subida exitosa via logUpload; nuevo endpoint POST /api/admin/unpin (protegido con requireAdminKey, loguea exito y fallo).
- backend/scripts/audit-uploads.ts (nuevo): lee upload_log de las ultimas 24h (--hours=N configurable), imprime timestamp/kind/address/ip/cid. Vive en backend/scripts/, no en el scripts/ raiz del repo (ese es el paquete de Hardhat/contratos) para reutilizar las dependencias de backend/ (better-sqlite3) sin agregarlas al paquete de contratos.
- backend/package.json: nuevo script audit:uploads.
- backend/.env.example y backend/.env: nueva variable ADMIN_UNPIN_KEY (se genero un valor real de 32 bytes aleatorios para el .env local de Abraham).
- README.md (raiz): seccion nueva bajo "Backend" con los comandos de audit:uploads y del curl de unpin.

Se descarto B (CAPTCHA/PoW) por ahora, tal como recomendaba este documento: se evalua solo si A+C no bastan en la practica.

Limitacion que se mantiene, documentada a proposito (no un descuido): IP+address combinado sigue siendo evadible por un atacante dispuesto a rotar ambos a la vez (VPN + wallet nueva en cada intento), sigue siendo mas caro que evadir solo uno de los dos, pero no es una barrera dura.

Entregables, estado real:
- [x] Rate limit combinado IP+address funcionando (codigo escrito y revisado).
- [x] Endpoint de unpin de emergencia funcionando, documentado, con su propia credencial separada.
- [x] Script de auditoria corrido contra datos reales (2026-07-29, confirmado por Abraham): 3 uploads reales listados con timestamp/kind/address/ip/cid correctos.
- [x] Documentacion en README.md de como Abraham usa el unpin en caso de necesitarlo.
- [x] Tests requeridos por este mismo punto (checkAndConsumeQuota, endpoint de unpin, audit-uploads): implementados 2026-07-29 con **Vitest 4.1.10 + Supertest 7.2.2** (nuevas devDependencies, versiones verificadas en npmjs.com el mismo dia). Ver seccion nueva mas abajo con el detalle y el razonamiento de por que Vitest en vez de Jest/`node:test`.

**Framework elegido: Vitest** (no Jest, no `node:test`). Motivo: los tests de este punto dependen de mockear modulos (`pinata.ts` para el endpoint de unpin, `fetch` implicito dentro de el) — `vi.mock` resuelve esto sin configuracion adicional para TS/ESM (a diferencia de Jest, que con ESM puro requiere flags experimentales, ver jestjs.io/docs/ecmascript-modules); `node:test` nativo se descarto por tener mocking de modulos ES todavia experimental (nodejs.org/api/test.html). Se sumo **Supertest** para testear los endpoints Express sin levantar un puerto real.

**Cambios de testabilidad necesarios (minimos, sin tocar comportamiento):**
- `backend/src/index.ts`: ahora exporta `app` y solo llama `app.listen(...)` si el archivo se ejecuta directamente (`process.argv[1] === fileURLToPath(import.meta.url)`) — permite importar `app` en tests con Supertest sin bindear un puerto real ni competir con otros procesos.
- `backend/scripts/audit-uploads.ts`: mismo guard para `main()`, y `parseHoursArg`/`formatRow` ahora exportados para poder testearlos como funciones puras.

**Archivos de test nuevos:**
- `backend/src/rateLimiter.test.ts` (5 tests): `hasQuota`/`consumeQuota` con SQLite temporal aislado (`DB_PATH` a un archivo en `os.tmpdir()`, distinto por archivo de test) — bloqueo por IP con distinta address, bloqueo por address con distinta IP, case-insensitive de address, reset tras rodar la ventana de tiempo (`vi.useFakeTimers`).
- `backend/src/admin.test.ts` (5 tests, Supertest contra `app` real con `./pinata.js` mockeado via `vi.mock`): sin `X-Admin-Key` -> 401, key incorrecta -> 401, key correcta -> llama `unpinFromIPFS` y responde 200, `cid` faltante -> 400 incluso con key valida, fallo de Pinata -> 502.
- `backend/scripts/audit-uploads.test.ts` (5 tests): `parseHoursArg`/`formatRow` como funciones puras, mas un test de integracion contra SQLite sembrado (`logUpload` + una fila vieja insertada directo via `db.prepare(...)`) confirmando que `listUploadsSince` incluye lo reciente y excluye lo que quedo fuera de la ventana de 24h.

**Confirmado por Abraham (2026-07-29), `npm run test` real:**
```
✓ scripts/audit-uploads.test.ts (5 tests) 33ms
✓ src/rateLimiter.test.ts (5 tests) 37ms
✓ src/admin.test.ts (5 tests) 240ms
Test Files  3 passed (3)
     Tests  15 passed (15)
```

**Confirmado por Abraham (2026-07-29):** `npm run lint` (tsc --noEmit) compila sin errores. `npm run audit:uploads` corrido con exito contra datos reales.

### Estado: CERRADO (2026-07-29) — Opciones A+C implementadas + tests automatizados (Vitest+Supertest, 15/15 en verde, confirmado por Abraham)

---

## 12. Tests E2E con wallet real (Playwright + Anvil) — 🟠 Alto

### Por qué importa
`04_STATUS.md` (sesión 2026-07-19(2)) descarta explícitamente E2E como "fuera de alcance". Pero los **dos bugs más serios encontrados en todo el proyecto** (`canClaim`/`canRefund` nunca activándose por un `isExpired` fantasma, y el destructuring roto de `toProject`) ocurrieron exactamente en la capa de integración real entre frontend y contrato — justo lo que los mocks de RTL/Vitest no ejercitan. Mantener el descarte de E2E después de haber encontrado dos bugs ahí es inconsistente con la propia evidencia del proyecto.

### Opciones

**Opción A — Playwright + Anvil (fork local), flujo feliz completo**
- Levantar un nodo Anvil local (viene con Foundry) con el contrato ya deployado, una wallet de test con clave conocida inyectada al navegador (via un mock de EIP-1193 o la extensión de test de Synpress/Playwright), y correr Playwright contra `frontend2.0` real (`npm run dev`) haciendo: crear proyecto → pledge desde una segunda wallet → claim → verificar estado en UI.
- **Costo:** el setup inicial es la parte cara (requiere Foundry instalado en el runner de CI, configurar la wallet de test) — una vez armado, mantenerlo es barato porque reusa fixtures.
- Librería recomendada para la wallet simulada: `@synthetixio/synpress` (extiende Playwright con soporte de MetaMask real automatizado) — confirmar versión vigente en npmjs.com antes de instalar, no asumir de memoria.

**Opción B — Playwright contra testnet real (Sepolia)**
- En vez de Anvil local, correr contra el contrato ya desplegado en Sepolia con una wallet de test fondeada.
- **Costo:** más lento (tiempos de bloque reales, ~12s), depende de disponibilidad de RPC de terceros y de tener ETH de testnet siempre disponible — más frágil para CI que corre en cada PR.
- **Descartada como opción principal**: Anvil da control total de tiempo/estado sin depender de infraestructura externa, mejor ajuste para CI.

### Recomendación (a decidir por Abraham, no ejecutada)
**Opción A**, ejecutada como job de CI aparte (no bloqueante inicialmente, igual que se hizo con Lighthouse en el punto 7 ya cerrado) hasta tener una corrida estable, luego promovida a bloqueante.

### Plan de ejecución paso a paso (cuando se autorice)
1. Instalar Foundry en el entorno de desarrollo (no en este sandbox, requiere acceso que hoy no está disponible — a correr por Abraham en WSL) y confirmar `anvil --version`.
2. `scripts/e2e-setup.ts`: levanta Anvil (`anvil --fork-url <RPC> ` o limpio sin fork), deploya `Crowdfunding.sol` con Hardhat/Ignition apuntando a `localhost:8545`, imprime la dirección para que Playwright la use.
3. Instalar `@playwright/test` + `@synthetixio/synpress` (versiones exactas verificadas en npmjs.com el mismo día de instalación) en `frontend2.0/` como devDependency.
4. `frontend2.0/e2e/fixtures.ts`: configurar 2 wallets de test (creador y backer) con claves privadas conocidas de Anvil (las cuentas default de Anvil, nunca usar una clave real).
5. `frontend2.0/e2e/happy-path.spec.ts`: escenario completo — conectar wallet, crear proyecto (mock del backend de IPFS o levantar `/backend` también en el setup con `PINATA_JWT` de test), pledge desde la segunda wallet, verificar que `isSuccessful` se refleje en UI, claim desde la primera wallet, verificar que el botón desaparece tras el claim.
6. Job nuevo en `.github/workflows/ci.yml` (`e2e`, `pull_request` únicamente, no bloqueante los primeros PRs mientras se estabiliza — mismo criterio ya usado con Lighthouse en el punto 7).

### Tests requeridos
- El propio E2E **es** el test — no requiere tests adicionales sobre sí mismo. Sí requiere al menos 2 escenarios: (1) flujo feliz completo descrito arriba, (2) un flujo de `refund` (proyecto sin alcanzar meta, backer pide reembolso, verificar que el balance de la wallet sube).

### Entregables mínimos para considerar este punto CERRADO
- [ ] `scripts/e2e-setup.ts` levantando Anvil + contrato deployado de forma reproducible.
- [ ] Al menos 2 specs de Playwright pasando localmente (flujo feliz + refund).
- [ ] Job de CI corriendo (aunque sea no-bloqueante al inicio) con al menos una corrida verde documentada.
- [ ] Documentado en `README.md` cómo correr los E2E localmente.

### Decisión: **Variante de la Opción A — Playwright + Anvil, sin Synpress** (2026-07-29)

Se descartó automatizar la extensión real de MetaMask (Synpress): `wagmi` usa `injected()`, un conector EIP-1193 genérico sin código propio específico de MetaMask — automatizar su UI/popups habría probado un componente de terceros que este proyecto no controla, por un costo de mantenimiento alto (versión de MetaMask que puede romper el test) sin acercarse al riesgo real (los 2 bugs más serios del proyecto ocurrieron en la integración frontend↔contrato, no en el flujo de conexión de wallet). En su lugar: un `window.ethereum` mínimo inyectado por Playwright (`page.addInitScript`), respaldado por las cuentas de prueba de Anvil ya desbloqueadas en el propio nodo (mismo comportamiento que el nodo local de Hardhat) — Anvil firma `eth_sendTransaction`/`personal_sign` del lado del servidor, sin manejo de claves privadas en el navegador.

**Ajuste adicional de alcance (no estaba en el plan original, decidido al implementar):** en vez de levantar `/backend` real con credenciales de Pinata, se mockean a nivel de red (`page.route`) los 4 endpoints de auth/IPFS y el gateway de Pinata. Justificación: el pinning IPFS no es la capa donde ocurrieron los bugs reales del proyecto (`05_CRITICAL_REVIEW.md`); exigir una cuenta real de Pinata solo para correr E2E en CI habría sido una dependencia externa frágil sin aportar al objetivo real del punto.

**Implementado:**
- `hardhat.config.ts`: red `anvil` nueva (`http://127.0.0.1:8545`, claves de prueba públicas de Anvil hardcodeadas — documentado por qué es seguro).
- `scripts/e2e-setup.ts` (nuevo, raíz): levanta Anvil si no está corriendo, deploya `Crowdfunding.sol` reutilizando `scripts/deploy.ts --network anvil`, escribe `frontend2.0/.env.e2e.local` con la dirección real. Script nuevo `npm run e2e:setup` en la raíz.
- `frontend2.0/src/wagmi.ts`/`crowdfundingConfig.ts`: chain `foundry` (Anvil, id 31337) agregada **solo** cuando `VITE_E2E=true` — la app de producción nunca ve esta chain.
- `frontend2.0/e2e/fixtures.ts`: provider EIP-1193 inyectado + mocks de red para `/api/auth/*`, `/api/pin-file`, `/api/pin-json` y `gateway.pinata.cloud` (con un store compartido entre las dos wallets de cada test, para que lo que "pinea" la creadora sea leíble por la backer, igual que IPFS real).
- `frontend2.0/e2e/happy-path.spec.ts`: crear proyecto (wallet A) → pledge exacto a la meta (wallet B) → claim (wallet A) → confirma que el botón "Claim funds" desaparece.
- `frontend2.0/e2e/refund.spec.ts`: proyecto con meta alta → pledge (wallet B) → refund → confirma que el botón "Request refund" desaparece **y** que el balance de la wallet sube (verificado con `eth_getBalance` real contra Anvil).
- `frontend2.0/playwright.config.ts` + `@playwright/test@1.62.0` (devDependency, versión verificada en npmjs.com el mismo dia) + script `test:e2e`.
- `.github/workflows/ci.yml`: job `e2e` nuevo (solo `pull_request`, `continue-on-error: true` — mismo criterio ya usado con `lighthouse` en su primera versión, no bloqueante hasta tener corridas estables), instala Foundry via `foundry-rs/foundry-toolchain@v1`.
- `.gitignore`: `deployments/anvil.json`, `ignition/deployments/anvil`, `frontend2.0/.env.e2e.local`, reportes de Playwright — todo efimero, nunca versionado (a diferencia de los deploys reales de testnet).
- `frontend2.0/e2e/README.md` + sección nueva en `README.md` raíz con los comandos.

**No verificable desde este entorno de análisis:** Foundry (`anvil`) no está instalado aquí ni es instalable (dominio `foundry.paradigm.xyz` fuera de la red permitida de este sandbox) — confirmado con `anvil --version` (`command not found`). El código está escrito y revisado, pero **Abraham debe correrlo y confirmar el resultado real** antes de considerar este punto cerrado.

### Entregables (pendientes de confirmación real de Abraham)
- [x] `scripts/e2e-setup.ts` levantando Anvil + contrato deployado de forma reproducible (código listo, no ejecutado aquí).
- [x] 2 specs de Playwright escritas (flujo feliz + refund) — pendiente confirmar que pasan localmente.
- [x] Job de CI agregado (no bloqueante) — pendiente al menos una corrida verde real en GitHub Actions.
- [x] Documentado en `README.md`/`frontend2.0/e2e/README.md` cómo correr los E2E localmente.

### Estado: IMPLEMENTADO (2026-07-29), pendiente de confirmación real por Abraham (`npm run e2e:setup` + `npm run test:e2e`)

---

## 13. Lighthouse CI: `warn` → `error` con línea base real — 🟡 Medio

### Por qué importa
El punto 7 (ya cerrado) dejó los umbrales en `warn` a propósito porque nunca hubo una corrida real confirmada localmente (bloqueada por el bug de `NO_FCP` en WSL, documentado ahí). Con el job de CI ya funcionando desde el cierre del punto 7, este paso trivial quedó sin hacer: nadie revisó los números reales que ya está produciciendo CI en cada PR desde el 2026-07-21.

### Opciones

**Opción A — Revisar el historial de PRs ya corridos y fijar el umbral con esos datos**
- No requiere ninguna corrida nueva: los PRs desde el 2026-07-21 ya tienen el resultado de Lighthouse en sus checks. Tomar el peor resultado de los últimos N PRs como línea base, con margen (ej. -3 puntos) para no ser frágil ante variación normal.

**Opción B — Correr manualmente unas 5 veces en CI (dispatch manual) antes de decidir**
- Más preciso (descarta variación de una corrida única), pero más lento de ejecutar.

### Recomendación
**A primero** (ya hay datos disponibles sin costo adicional); si el histórico es insuficiente (pocos PRs corridos), pasar a B.

### Plan de ejecución paso a paso (cuando se autorice)
1. Revisar los checks de Lighthouse de todos los PRs mergeados desde 2026-07-21 en GitHub Actions, anotar Performance/Accessibility/SEO de cada uno.
2. Si hay ≥3 corridas: tomar el mínimo observado menos un margen de 3 puntos como nuevo umbral.
3. Si hay <3 corridas: usar Opción B — disparar el job manualmente (`workflow_dispatch` o PRs vacíos) 5 veces, tomar el mismo criterio del paso 2.
4. Editar `frontend2.0/.lighthouserc.json`: cambiar `warn` → `error` en las 3 categorías con el umbral calculado, `numberOfRuns` sigue en 1 salvo que el paso 3 muestre alta varianza (en ese caso subir a 3).
5. Confirmar con un PR de prueba que el job efectivamente bloquea si se fuerza una regresión (ej. importar una imagen sin optimizar a propósito, ver que falla, revertir).

### Tests requeridos
- No aplica (es configuración de CI, no código de aplicación). El "test" es el propio paso 5: confirmar que el gate bloquea de verdad antes de darlo por cerrado.

### Entregables mínimos para considerar este punto CERRADO
- [ ] Línea base documentada (de dónde salió el número, no un valor inventado).
- [ ] `.lighthouserc.json` actualizado con `error` en vez de `warn`.
- [ ] Un PR de prueba confirmando que el gate bloquea ante una regresión real.

### Decisión: _(pendiente de autorización de Abraham)_
### Estado: PLANIFICADO — no ejecutado

---

## 14. Análisis de UX del modelo sin `deadline` (riesgo de fondos "olvidados") — 🟡 Medio

### Por qué importa
`02_SMART_CONTRACT_SPEC.md` documenta bien el *por qué técnico* de eliminar `deadline` (el creador decide cuándo reclamar, sin cierre automático). Lo que no está evaluado en ningún doc es el *comportamiento de usuario*: sin presión de tiempo, (a) un backer puede olvidar que aportó y nunca pedir `refund` si el proyecto no prospera, dejando ETH inmovilizado indefinidamente (no bloqueado por el contrato — sigue siendo reembolsable — pero sí "dormido" en la práctica), y (b) sin urgencia ("quedan 3 días"), la tasa de conversión de un crowdfunding suele ser menor que con deadline (patrón conocido de plataformas como Kickstarter, que usan la fecha límite como palanca de conversión). Esto no es un bug de seguridad, es un riesgo de producto que Claudio (el cliente no técnico) probablemente no evaluó al pedir el cambio.

### Opciones

**Opción A — Solo UI: recordatorios y transparencia, sin tocar el contrato**
- `ProjectDetail.tsx`/`ProjectCard.tsx` muestran "hace X días que aportaste, sin actividad reciente del proyecto" para pledges antiguos sin reclamo. Backend opcional: email/notificación si se agrega un canal de contacto (fuera de alcance actual, el proyecto no tiene sistema de notificaciones).
- **Costo:** bajo, puramente de frontend, no cambia ninguna garantía del contrato.

**Opción B — Deadline opcional (no obligatorio) al crear el proyecto**
- Volver a incluir un campo de fecha límite, pero **opcional** — el creador elige si su campaña tiene urgencia o no. Requiere modificar `Crowdfunding.sol` (reintroducir el campo, con `0`/ausente significando "sin límite") — cambio de bytecode, mismo proceso de redeploy ya documentado varias veces en `05_CRITICAL_REVIEW.md`.
- **Costo:** el más alto — vuelve a tocar el contrato ya auditado (Slither, revisión manual) después de haberlo simplificado deliberadamente en la sesión 2026-07-09. Requiere repetir el ciclo de seguridad completo del punto tocado.

**Opción C — No hacer nada, documentar el riesgo como aceptado**
- Válido si Abraham/Claudio, tras ver este análisis, deciden que el modelo actual (sin deadline) es intencional y aceptable — coherente con la decisión original ya tomada y bien razonada en `02_SMART_CONTRACT_SPEC.md`.

### Recomendación (a decidir por Abraham/Claudio, no ejecutada)
Este punto es el único de los 6 donde la recomendación técnica no basta — es una decisión de producto que le corresponde a Claudio, no una elección puramente técnica. **A es la mitigación de bajo costo recomendable en cualquier caso** (transparencia no tiene downside). B solo si Claudio confirma que la conversión sin urgencia es un problema real medido (no antes — no tocar el contrato por una hipótesis sin datos).

### Plan de ejecución paso a paso (solo Opción A, la que no requiere reabrir el contrato)
1. `useProjectMetadata.ts` o un nuevo hook `usePledgeAge.ts`: calcular tiempo transcurrido desde el evento `Pledged` más reciente de un proyecto (requiere leer logs, no solo el struct — evaluar costo de RPC de esto, quizás limitarlo a la vista de detalle, no al listado completo, para no encarecer `useProjects`).
2. `ProjectDetail.tsx`: banner informativo (no bloqueante) tipo "Este proyecto no ha recibido aportes en los últimos N días" cuando aplique.
3. Para el propio backer: si `pledgeOf(usuario) > 0 && !claimed`, mostrar recordatorio explícito de que puede pedir `refund` en cualquier momento (mensaje ya parcialmente cubierto por el botón existente, reforzar la redacción, no la lógica).

### Tests requeridos
- Test de la lógica de cálculo de antigüedad de pledge (unitario, con logs mockeados).
- Test de componente confirmando que el banner aparece/no aparece según el umbral de días configurado.

### Entregables mínimos para considerar este punto CERRADO
- [ ] Decisión explícita de Claudio/Abraham documentada aquí: ¿A, B o C? (no asumida por el asistente).
- [ ] Si A: banner implementado y testeado.
- [ ] Si B: nueva ronda completa de Slither + revisión manual antes de considerar el contrato listo para redeploy (mismo estándar que Fase 2).
- [ ] Si C: entrada de cierre explicando por qué se acepta el riesgo, para que quede como decisión consciente y no como omisión.

### Decisión: _(pendiente — requiere input de Claudio, no solo de Abraham)_
### Estado: PLANIFICADO — no ejecutado
