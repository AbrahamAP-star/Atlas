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
