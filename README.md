# Atlas

On-chain crowdfunding dApp (funds held 100% in the contract, no admin custody). See `docs/00_PROJECT_OVERVIEW.md` for full business context (Spanish — see `docs/` language note below).

> **Language note:** this file follows the project's hard rule (`docs/00_PROJECT_OVERVIEW.md` § "Convención de idioma") — everything outside `/docs` is English. `/docs` stays in Spanish, since it's the communication channel with the client/product owner. The non-technical end-user guide for Claudio lives at `docs/11_USER_GUIDE.md` (Spanish, on purpose).

## Repo structure

```
contracts/      Crowdfunding.sol (Hardhat 3 + OZ 5.6.1)
test/           node:test + viem (NOT Mocha/Chai)
frontend2.0/    TanStack Start (SSR) — official frontend. frontend/ (Vite SPA) was removed.
backend/        Minimal Express proxy to Pinata (hides the JWT)
docs/           Source of truth for architecture/status (see 04_STATUS.md)
```

## Requirements
- Node.js ≥ 22.12 (CI runs a 22/24 matrix, see `.github/workflows/ci.yml`)
- A Pinata account (free plan is enough) with a **restricted-scope** API key (`pinFileToIPFS`/`pinJSONToIPFS` only)

## 1. Contracts (repo root)

```bash
npm install
npm run compile
npm test            # 38 tests (Crowdfunding + PledgeFuzz + ReentrancyAttack)
npm run test:gas    # gas report (hard asserts already in the tests: <350k createProject, <120k pledge)
```

Secrets via Hardhat 3 keystore (no `.env`):
```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set BASESCAN_API_KEY
```

Contract already deployed (Sepolia, includes `deleteProject`): `0xb76d8fE65b68C80c71d0494Ba69E2874EdA7Ba6b` (see `deployments/sepolia.json`). Deploy on Base Sepolia (the actual L2 target) is still pending — see `docs/09_ROADMAP_MEJORAS.md` § 2.

## 2. Backend (`/backend`)

```bash
cd backend
npm install
cp .env.example .env    # fill in PINATA_JWT (restricted scope, see docs/05_CRITICAL_REVIEW.md)
npm run dev              # runs on :3001
```

`FRONTEND_ORIGIN` in `backend/.env` must point to `frontend2.0`'s real dev port (`8080` by default, via `@lovable.dev/vite-tanstack-config`).

**Rate limiting (roadmap point 11, `docs/09_ROADMAP_MEJORAS.md`):** uploads are limited by IP **and** wallet address combined (`backend/src/rateLimiter.ts`), not IP alone. Besides `PINATA_JWT`, fill in `ADMIN_UNPIN_KEY` in `backend/.env` (a separate credential, used only by `POST /api/admin/unpin` to take down reported content):
```bash
cd backend
npm run audit:uploads              # lists uploads from the last 24h (CID + wallet + IP)
curl -X POST http://localhost:3001/api/admin/unpin \
  -H "X-Admin-Key: $ADMIN_UNPIN_KEY" -H "Content-Type: application/json" \
  -d '{"cid":"<REPORTED_CID>"}'
```

## 3. Frontend (`/frontend2.0`)

```bash
cd frontend2.0
npm install
npm run dev      # needs the backend running in parallel to create projects (IPFS)
npm run test      # 42+ tests (Vitest + RTL)
npm run build && npm run preview   # local production build
```

`frontend2.0/.env` already has the Sepolia contract address. The functional dApp is embedded in `/` (the `#demo` section), not a separate route — see `docs/08_FRONTEND_MIGRATION.md`.

## 4. E2E tests (Playwright + Anvil)

```bash
npm run e2e:setup                 # root: starts Anvil + deploys the contract
cd frontend2.0 && npm run test:e2e   # 2 specs: happy path (create/pledge/claim) + refund
```
Requires Foundry (`anvil`) installed. Full detail, why Synpress/real MetaMask isn't used, and why the real backend doesn't run: `frontend2.0/e2e/README.md`. Source: `docs/09_ROADMAP_MEJORAS.md` § 12.

## CI

`.github/workflows/ci.yml`: jobs `contracts` (Node 22/24), `frontend` (Node 22/24), `gas-report` (comments on PRs), `lighthouse` (thresholds at `warn`, see `docs/09_ROADMAP_MEJORAS.md` § 7).

## Known limitation: no pause/upgrade mechanism

`Crowdfunding.sol` has no `onlyOwner`/pause by design (see `docs/02_SMART_CONTRACT_SPEC.md`) — no admin can ever freeze withdrawals. The trade-off is that a critical post-deploy bug can't be patched in place either; see `docs/10_INCIDENT_RUNBOOK.md` for the response plan. The frontend surfaces this to users directly via `ContractRiskNotice` wherever funds move (pledge/create).

## More context
- Real status and session log: `docs/04_STATUS.md`
- Architecture decisions and rationale: `docs/01_ARCHITECTURE.md`, `docs/05_CRITICAL_REVIEW.md`
- Pending improvements roadmap: `docs/09_ROADMAP_MEJORAS.md`
- Non-technical user guide (Spanish, for Claudio): `docs/11_USER_GUIDE.md`
