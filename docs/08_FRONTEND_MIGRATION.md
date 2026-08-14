# Frontend Migration: Vite SPA → TanStack Start (frontend2.0)

## Decision and reason
`frontend/` (classic Vite SPA) was replaced by `frontend2.0/` (TanStack Start, SSR + file-based routing), initially generated with Lovable as a portfolio/case-study landing for the project. `frontend2.0/` is the repo's official frontend. **`frontend/` was removed from the repo (2026-07-18)**, once confirmed nothing in `frontend2.0/`/`backend/` referenced it — no longer present on disk, only in git history.

Reason for the architecture change: better long-term maintainability as the dApp grows — file-based routing instead of a single view-switching `useState`, SSR for the public landing (better SEO/initial load for the portfolio page), and a component base (shadcn/ui + Tailwind v4) already integrated by default instead of installed ad-hoc as in `06_FRONTEND_VISUAL_UPGRADE.md` §9. No dApp-side business logic (contract hooks, IPFS, tx tracking) was rewritten: migrated 1:1.

## What did NOT change (migrated 1:1, only location/imports)
All contract-logic hooks (`useProjects`, `useProjectStatus`, `useCreateProject`, `usePledge`, `useClaimFunds`, `useRefund`, `useDeleteProject`, `useTxStatus`, `useNetworkStatus`), IPFS/backend hooks (`useIpfsAuth`, `usePinataUpload`, `useProjectMetadata`), `TxTrackerContext.tsx`, action components (`ConnectWallet`, `ProjectList`, `ProjectCard`, `ProjectDetail`, `CreateProjectForm`, `PledgeForm`, `GlobalTxToasts`, `TransactionStatus`), ABI/contract config, `wagmi.ts` (plus the `ssr: true` addition, below), sounds (`lib/sounds.ts`), document text extraction (`lib/documentText.ts`), visual tokens in `styles.css`, and the dApp's infinite-marquee hero (`CarouselRow`/`ShowcaseCard`/`LandingCTA`/`useInfiniteMarquee`/`usePrefersReducedMotion`/`showcase.data.ts`/`types/landing.ts`).
Only mechanical change repeated across all of these: relative imports (`../hooks/...`) became `@/...` alias imports (already provided by the Lovable template's `tsconfig.json`/`vite.config.ts`).

## What DID change (real TanStack Start adaptation)

### 1. Name collision: two different "Hero"s
`frontend2.0/src/components/landing/Hero.tsx` already existed (Lovable-generated), the **portfolio/case-study** hero (marketing, no contract logic). The old dApp hero (marquee + Explore/Create buttons) was relocated to a new `components/dapp/` folder alongside `CarouselRow.tsx`, `LandingCTA.tsx`, `ShowcaseCard.tsx`, `AppShell.tsx`, to avoid clashing with Lovable's already-used name/folder.

### 2. Two routes, two purposes (later consolidated, see 2026-07-18 session)
- **`/`** (`routes/index.tsx`, pre-existing): portfolio landing, SSR, static marketing content, no wagmi.
- **`/app`** (`routes/app.tsx`, new at the time): the real dApp (same `home/list/detail/create` single-`useState` behavior as the old `App.tsx`). The portfolio hero's "See live demo" CTA linked here. `routes/app.tsx` mounted `WagmiProvider`+`TxTrackerProvider` **locally** (not in `routes/__root.tsx`) so the public landing at `/` doesn't load wagmi or RPC overhead. `QueryClientProvider` stayed shared from `__root.tsx` (already there for TanStack Router).

### 3. SSR compatibility adaptations (new, not needed in the old SPA)
The Vite SPA never ran server-side; TanStack Start does render a first server pass, so 3 "doesn't exist on the server" guards were added without touching real logic: `wagmi.ts` (`ssr: true` — first server render returns a consistent "disconnected" state instead of trying to read a wallet), `TxTrackerContext.tsx` (`typeof window === "undefined"` guard before reading `localStorage`), `lib/sounds.ts` (`typeof Audio === "undefined"` guard), `lib/documentText.ts` (`typeof window === "undefined"` guard before configuring pdf.js's worker).

### 4. CSS scope (`.dapp-scope`)
`styles.css` carried a `.dapp-scope` class (from a prior migration pass) resetting `button`/`input`/`label` styles to the old frontend's look, so they coexist with the portfolio's Tailwind/shadcn utilities without either side clobbering the other. `routes/app.tsx` wrapped `<AppShell />` in `<div className="dapp-scope">`.

## Session 2026-07-18: dApp embedded in `/` + `frontend/` deleted
At Abraham's request, `/app` was removed: the functional dApp (`AppShell`, with its real hero/marquee) now lives as the `#demo` section of `/` (`components/landing/DemoSection.tsx`), not a separate destination. `routes/app.tsx` left empty; `routeTree.gen.ts` hand-edited to drop that route (regenerates on the next `npm run dev`). Also added `components/landing/ArchitectureDecisions.tsx` (short architecture-decisions block visible on the landing).
Once confirmed nothing in `frontend2.0/`/`backend/` imported anything from `frontend/`, Abraham deleted the `frontend/` folder from the repo (no longer present on disk, see "Decision and reason" above).
