# Migración de frontend: Vite SPA → TanStack Start (frontend2.0)

## Decisión y motivo
`frontend/` (Vite SPA clásica) se reemplazó por `frontend2.0/` (TanStack Start,
SSR + file-based routing), generado inicialmente con Lovable como landing de
portfolio/case-study para el proyecto. `frontend2.0/` es el frontend oficial
del repo. **`frontend/` fue eliminada del repo (2026-07-18)**, una vez
confirmado que ningún archivo de `frontend2.0/`/`backend/` la referenciaba —
ya no queda como referencia histórica en disco, solo en el historial de git.

Motivo del cambio de arquitectura (Vite SPA → TanStack Start): mejor
mantenimiento a futuro si la dApp crece — routing por archivos en vez de un
único `useState` de vistas, SSR para la landing pública (mejor SEO/carga
inicial para la página de portfolio), y una base de componentes (shadcn/ui +
Tailwind v4) ya integrada de fábrica en vez de instalada ad-hoc como en
`06_FRONTEND_VISUAL_UPGRADE.md` §9. No se reescribió ninguna lógica de negocio
del lado dApp (hooks de contrato, IPFS, tx tracking): se migró 1:1.

## Qué NO cambió (migrado 1:1, solo ubicación/imports)
- Toda la lógica de contrato: `hooks/useProjects.ts`, `useProjectStatus.ts`,
  `useCreateProject.ts`, `usePledge.ts`, `useClaimFunds.ts`, `useRefund.ts`,
  `useDeleteProject.ts`, `useTxStatus.ts`, `useNetworkStatus.ts`.
- IPFS/backend: `useIpfsAuth.ts`, `usePinataUpload.ts`, `useProjectMetadata.ts`.
- Tracking de transacciones: `context/TxTrackerContext.tsx`.
- Componentes de acción: `ConnectWallet`, `ProjectList`, `ProjectCard`,
  `ProjectDetail`, `CreateProjectForm`, `PledgeForm`, `GlobalTxToasts`,
  `TransactionStatus`.
- ABI, config de contrato (`contracts/crowdfundingAbi.ts`,
  `crowdfundingConfig.ts`), `wagmi.ts` (con el agregado `ssr: true`, ver abajo).
- Sonidos (`lib/sounds.ts`), extracción de texto de documentos
  (`lib/documentText.ts`), tokens visuales de `styles.css`.
- El Hero con marquee infinito de la dApp (`CarouselRow`/`ShowcaseCard`/
  `LandingCTA`/`useInfiniteMarquee`/`usePrefersReducedMotion`/
  `data/showcase.data.ts`/`types/landing.ts`).

Único cambio mecánico repetido en todos estos archivos: imports relativos
(`../hooks/...`, `../../data/...`) pasaron a alias `@/...` (`tsconfig.json` /
`vite.config.ts` ya traen `@` → `src` de fábrica en la plantilla de Lovable).

## Qué SÍ cambió (adaptación real a TanStack Start)

### 1. Colisión de nombres: dos "Hero" distintos
`frontend2.0/src/components/landing/Hero.tsx` ya existía (generado por
Lovable) y es el Hero del **portfolio/case-study** (marketing, sin lógica de
contrato). El Hero viejo de la dApp (marquee + botones "Explorar"/"Crear") se
reubicó en una carpeta nueva, **`components/dapp/`**, junto con
`CarouselRow.tsx`, `LandingCTA.tsx`, `ShowcaseCard.tsx` y `AppShell.tsx`, para
no pisar el nombre/carpeta ya usado por Lovable.

### 2. Dos rutas, dos propósitos
- **`/`** (`routes/index.tsx`, ya existente): landing de portfolio, SSR,
  contenido estático de marketing. Sin wagmi.
- **`/app`** (`routes/app.tsx`, nuevo): la dApp real (mismo comportamiento que
  el `App.tsx` viejo — un único `useState` de vistas `home/list/detail/create`,
  sin sub-rutas por vista, para no introducir lógica de navegación nueva).
  El botón "Ver demo en vivo" del Hero del portfolio ahora enlaza a `/app`.

`routes/app.tsx` monta `WagmiProvider` + `TxTrackerProvider` **localmente**
(no en `routes/__root.tsx`), para que la landing pública en `/` no cargue
wagmi ni tenga overhead de RPC. `QueryClientProvider` sí es compartido desde
`__root.tsx` (ya lo traía Lovable para TanStack Router).

### 3. Adaptaciones de compatibilidad SSR (nuevas, no eran necesarias en la SPA vieja)
La SPA de Vite nunca corría en servidor; TanStack Start sí renderiza un primer
paso en servidor, así que se agregaron guards de "esto no existe en el
servidor" en 3 puntos, sin tocar la lógica real:
- **`wagmi.ts`**: `ssr: true` en `createConfig` — el primer render de servidor
  devuelve estado "desconectado" consistente en vez de intentar leer wallet.
- **`context/TxTrackerContext.tsx`**: guard `typeof window === "undefined"` al
  leer `localStorage` en la inicialización del estado.
- **`lib/sounds.ts`**: guard `typeof Audio === "undefined"`.
- **`lib/documentText.ts`**: guard `typeof window === "undefined"` antes de
  configurar el worker de `pdf.js` (`GlobalWorkerOptions.workerSrc`).

### 4. CSS scope (`.dapp-scope`)
`styles.css` ya traía (de la migración previa) una clase `.dapp-scope` que
resetea estilos de `button`/`input`/`label` a los del frontend viejo (border,
padding, etc.), para que convivan con las utilities de Tailwind/shadcn del
portfolio sin que unos pisen a otros. `routes/app.tsx` envuelve `<AppShell />`
en un `<div className="dapp-scope">`.

## Pendiente (no bloqueante)
- Correr `npm install` + `npm run dev`/`build` en `frontend2.0/` (no posible
  desde este entorno, sin acceso al filesystem de WSL vía bash) para que el
  plugin de TanStack Router regenere `routeTree.gen.ts` incluyendo la nueva
  ruta `/app` — necesario antes de que la app compile/arranque.
- `backend/` no requirió ningún cambio: sigue siendo agnóstico de qué
  frontend le hace fetch (`FRONTEND_ORIGIN` en `backend/.env` debe seguir
  apuntando al puerto real donde corra `frontend2.0` en dev).
- **Nota sobre `deleteProject`:** el ABI y los hooks ya migrados incluyen
  `deleteProject`/`ProjectHasActiveFunds`/`NoFundsToRefund`/`ProjectDeleted`.
  Esto no es un hallazgo nuevo: ya esta documentado en `04_STATUS.md` §
  "Sesion 2026-07-16: nueva funcion `deleteProject`", incluyendo el redeploy
  en Sepolia a `0xb76d8fE65b68C80c71d0494Ba69E2874EdA7Ba6b`. `frontend2.0/.env`
  se creo con esa misma direccion, ya consistente con el contrato real.
- No se probó `npm run build`/Lighthouse en `frontend2.0` (misma limitación
  ya documentada en `06_FRONTEND_VISUAL_UPGRADE.md`/`04_STATUS.md`: este
  asistente no tiene acceso de ejecución al filesystem de WSL).

## Sesión 2026-07-18: dApp embebida en `/` + borrado de `frontend/`

A pedido de Abraham, la ruta `/app` se eliminó: la dApp funcional
(`AppShell`, con su Hero/marquee real) ahora vive como sección `#demo`
dentro de la misma página `/` (`components/landing/DemoSection.tsx`), no
como destino separado. `routes/app.tsx` quedó vacío y `routeTree.gen.ts`
se editó a mano para quitar esa ruta (se regenerará solo en el próximo
`npm run dev`). También se agregó `components/landing/ArchitectureDecisions.tsx`
(bloque corto de decisiones de arquitectura + justificación, visible en la
landing).

Una vez confirmado que ningún archivo de `frontend2.0/`/`backend/` importaba
nada de `frontend/`, Abraham borró la carpeta `frontend/` del repo (ya no
queda como referencia histórica en disco, ver sección "Decisión y motivo"
arriba).
