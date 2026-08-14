# Execution Plan by Phases

Each phase is independent and ends in a functional/testable state. Don't advance a phase without checking its boxes.

## Phase 0 — Repo setup
- [x] `npx hardhat init` (TS template)
- [x] Install OZ v5.5.x, wagmi, viem, @tanstack/react-query (pinned versions, no `^`) — installed OZ 5.6.1 (compatible)
- [x] Folder structure: `/contracts`, `/scripts`, `/test`, `/frontend`, `/docs`
- [x] Secrets management: **Hardhat 3 keystore** (`npx hardhat keystore set <VAR>`) instead of `.env`/`.env.example` (deprecated, retired 2026-07-07 — see `04_STATUS.md`)

## Phase 1 — Smart contract core — **CLOSED (2026-07-06)**
- [x] `Crowdfunding.sol` per `02_SMART_CONTRACT_SPEC.md`
- [x] Compiles clean — `npm run compile` OK; only output is a generic OZ transient-storage warning, evaluated and confirmed safe (see `04_STATUS.md`)
- [x] Unit tests: create project, successful pledge, pledge past deadline (must revert), successful claim, unsuccessful claim (must revert), individual refund — `test/Crowdfunding.ts`, **17/17 passing**
- [x] Gas asserts in tests (`<350k` create, `<120k` pledge) — passing; a readable `test:gas` report remains a minor non-blocking pending item

## Phase 2 — Security & edge cases — **CLOSED (2026-07-07)**
- [x] Reentrancy test (attacker mock) — `contracts/mocks/ReentrancyAttacker.sol` + `test/ReentrancyAttack.ts`, covers `refund` and `claimFunds`
- [x] Basic fuzzing on amounts (`goal = 0`, `durationSeconds = 0`) — covered in Phase 1 (`InvalidGoal`/`InvalidDuration`) + `test/PledgeFuzz.ts` (fuzzing `msg.value`, `uint96` edges, exact `deadline` boundary)
- [x] Manual checklist review of `02_SMART_CONTRACT_SPEC.md` — see `05_CRITICAL_REVIEW.md` § "Manual review — Phase 2"
- [x] Slither — run 2026-07-07 (installed via pip in the analysis environment). 19 findings across 6 detectors, none critical/actionable (OZ library noise or already-justified patterns). Full table in `05_CRITICAL_REVIEW.md`. No code changes made.

## Phase 3 — L2 testnet deploy — **Sepolia (L1) deploy done; real Base Sepolia (L2, real target) pending funds**
- [x] Deploy script (`scripts/deploy.ts`) parametrized by network — uses Hardhat Ignition (`ignition/modules/Crowdfunding.ts`) via `hre.network.create()` + `connection.ignition.deploy(...)`; writes the deployed address to `deployments/<network>.json`
- [x] Verification config in `hardhat.config.ts` (`verify.etherscan.apiKey`, Basescan/Etherscan V2)
- [x] `.gitignore` fixed: no longer ignores `ignition/deployments/` (Hardhat recommends versioning it)
- [x] Ethereum Sepolia (L1 testnet) support added via Infura node in `hardhat.config.ts` (network `sepolia`, `chainType: "l1"`) — requested by Abraham as an extra testnet alongside Base Sepolia. Reuses `DEPLOYER_PRIVATE_KEY`/`BASESCAN_API_KEY` (Etherscan V2 is multichain); new var `SEPOLIA_RPC_URL` added. `scripts/deploy.ts` needed no changes: already network-agnostic via `hre.network.create()` + `--network`.
- [x] Real deploy on Ethereum Sepolia (L1) executed by Abraham (2026-07-07) with `scripts/deploy.ts --network sepolia` — address in `deployments/sepolia.json`. Note: not the architecture's target network (`01_ARCHITECTURE.md` assumes L2), used as a fallback since Base Sepolia had no testnet funds yet.
- [ ] Real Base Sepolia deploy — still pending, **Abraham must run this himself** once he has testnet ETH there, via `npx hardhat run scripts/deploy.ts --network baseSepolia`.
- [ ] Verify contract on block explorer (Etherscan for the Sepolia deploy already done; Basescan once Base Sepolia deploys) — pending `npx hardhat verify`.

## Phase 4 — Frontend base — **CLOSED (2026-07-08)**
- [x] React+TS+Vite+shadcn/ui+Wagmi+Viem+WagmiProvider+QueryClientProvider setup — `/frontend`, pinned versions (React 19.2.7, wagmi 3.6.17, viem 2.54.1, @tanstack/react-query 5.101.2, vite 8.1.3)
- [x] Wallet connection (MetaMask/EIP-6963) — `connectors: [injected()]` in `src/wagmi.ts`, `ConnectWallet.tsx` with network selector (Base Sepolia/Sepolia)
- [x] Project listing — `useProjects` (`src/hooks/useProjects.ts`) reads `nextProjectId` and batches `getProject` via `useReadContracts` (multicall), no dependency on event logs
- [x] Individual project detail — `ProjectDetail.tsx`, direct `useReadContract(getProject)`

## Phase 5 — Frontend actions — **CLOSED (2026-07-08)**
- [x] Create-project form (includes IPFS metadata upload before calling the contract) — `CreateProjectForm.tsx` + `usePinataUpload.ts`
- [x] "pledge" button with `useWriteContract` — `PledgeForm.tsx` + `usePledge.ts`
- [x] "claim" button (creator-only when applicable) — `ProjectDetail.tsx` + `useClaimFunds.ts`
- [x] "refund" button (visible only if the project failed and the user has a pledge) — `ProjectDetail.tsx` + `useRefund.ts`
- [x] Transaction state handling (pending/confirming/success/error) with readable non-technical messages — `useTxStatus.ts` + `TransactionStatus.tsx`
- **Documented risk (RESOLVED 2026-07-10):** `VITE_PINATA_JWT` no longer exists in the frontend. `/backend` (minimal Express) created as the only holder of the Pinata JWT; frontend talks to it via `VITE_BACKEND_URL`. See `05_CRITICAL_REVIEW.md`/`04_STATUS.md` § Pinata Backend.
- [x] Optional attached document (PDF/text) in "Create project", uploaded to IPFS alongside image/metadata — `CreateProjectForm.tsx` + `usePinataUpload.ts` (`documentCID`), see `04_STATUS.md` § "Phase 5 improvement (2026-07-08)". Client-side type (`application/pdf`/`text/plain`) and size (10 MB) validation.
- [x] `ProjectDetail.tsx` shows/links `documentCID` in the detail view — "view attached document" link via `documentUrl` (`useProjectMetadata`), added in the "Fix (2026-07-16)" session (`04_STATUS.md`). Confirmed against real code and closed in `09_ROADMAP_MEJORAS.md` § 6 (2026-07-20).

## Phase 6 — Final deploy and documentation
- [ ] Mainnet deploy on the chosen L2
- [ ] End-user `README.md` (connecting wallet, creating a project, pledging, claiming/refunding)
- [ ] Final technical documentation (architecture, decisions, how to run locally)
- [ ] Update `04_STATUS.md`

## Phase 7 (future, NOT now) — Growth
Platform fees, multi-token (ERC-20 alongside native), governance, creator reputation system, indexer (The Graph) to not depend solely on on-chain events.

## Post-review improvement roadmap (cross-cutting, doesn't replace these phases)
See `09_ROADMAP_MEJORAS.md`: points identified in project evaluations (CI, component/TxTracker test coverage, Base Sepolia deploy, persistent backend, etc.), each with options for Abraham to decide — doesn't compete with this document's phase order, executed on demand like `06_FRONTEND_VISUAL_UPGRADE.md`.

## Frontend visual upgrades (cross-cutting, not a phase in this list)
See `06_FRONTEND_VISUAL_UPGRADE.md`: reference map for AI agents with animations/hovers/glow/elevation and recommended stack (GSAP, design tokens, etc.). Activated on Abraham's demand over existing Phase 4/5 components, doesn't block or reorder Phases 3/6.

**Planned pending item (2026-07-10, executed 2026-07-11):** Landing hero with 3 infinite carousels (§9 of `06_FRONTEND_VISUAL_UPGRADE.md`). Introduces, at Abraham's explicit request, **Tailwind CSS v4 + shadcn/ui** (previously out of stack) — the sole deliberate exception to this plan's "don't add dependencies without real technical need" criterion, justified for learning purposes. Detail in `04_STATUS.md` and `06_FRONTEND_VISUAL_UPGRADE.md` §9.

## Architecture note (2026-07-17): frontend migration to TanStack Start
`frontend/` (Vite SPA) was replaced by `frontend2.0/` (TanStack Start, SSR + file-based routing) as the repo's official frontend. Reason: better long-term maintainability if the dApp grows (file-based routing instead of a single view-switching `useState`, SSR for the public landing). No phase in this plan changes scope because of this — it's a container/routing change, not business logic (contract, IPFS, tx tracking migrated 1:1). Full technical detail: `docs/08_FRONTEND_MIGRATION.md`.

**Update (2026-07-18):** the old `frontend/` (Vite SPA) folder was removed from the repo — no longer present even as historical reference on disk. The functional dApp also no longer lives on a separate route (`/app`) inside `frontend2.0/`: it's embedded as the `#demo` section of the landing (`/`). See `docs/08_FRONTEND_MIGRATION.md` § "Session 2026-07-18".

## Correction note (Phase 1, 2026-07-05)
This repo's real testing stack is **Hardhat 3 + `node:test` + viem + `hardhat-viem-assertions`**, not "Hardhat + Chai" as originally assumed in this plan. See `01_ARCHITECTURE.md`. Detailed status/next steps always in `04_STATUS.md`.
