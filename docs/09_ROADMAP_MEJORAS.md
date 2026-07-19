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
| 3 | Tests de componentes reales (render con RTL) | 🟠 Alto | PENDIENTE |
| 4 | Tests de `TxTrackerContext`/`useTxStatus` | 🟠 Alto | PENDIENTE |
| 5 | Backend: estado en memoria → persistente | 🟡 Medio | PENDIENTE |
| 6 | `documentCID` sin mostrar en `ProjectDetail` | 🟡 Medio | PENDIENTE (ya documentado en 04/05) |
| 7 | Lighthouse / validación en dispositivo real | 🟡 Medio | PENDIENTE (ya documentado en 04/06/07) |
| 8 | README usuario final + doc técnica de arranque | 🟢 Bajo | PENDIENTE — parte del checklist de Fase 6 |

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

### Decisión: _(pendiente)_
### Estado: PENDIENTE

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

### Decisión: _(pendiente)_
### Estado: PENDIENTE

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

### Decisión: _(pendiente)_
### Estado: PENDIENTE

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

### Decisión: _(pendiente — primero confirmar si ya está cerrado)_
### Estado: PENDIENTE

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

### Decisión: _(pendiente)_
### Estado: PENDIENTE
