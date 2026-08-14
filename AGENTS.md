# AGENTS.md — CrowdfundingDappClaudio

## Project Structure
- **Root**: Hardhat 3 workspace (contracts, tests, deploy scripts)
- **backend/**: Express + TypeScript proxy to Pinata/IPFS (hides JWT from frontend)
- **frontend2.0/**: TanStack Start + React 19 + Wagmi/Viem (main DApp)
- **contracts/**: Single Solidity contract `Crowdfunding.sol` (OpenZeppelin v5.6)
- **docs/**: Spanish-language specs (architecture, plan, status, roadmap, incident runbook)

## Key Commands

### Contracts (root)
```bash
npm run compile          # hardhat compile
npm test                 # hardhat test (includes gas asserts: createProject < 350k, pledge < 120k)
npm run test:gas         # REPORT_GAS=true hardhat test
npm run e2e:setup        # deploy to local Anvil for E2E
```

### Backend (backend/)
```bash
npm run dev              # tsx watch src/index.ts
npm run build            # tsc -b
npm run start            # node dist/index.js
npm run lint             # tsc --noEmit
npm run test             # vitest run
npm run audit:uploads    # tsx scripts/audit-uploads.ts
```

### Frontend (frontend2.0/)
```bash
npm run dev              # vite dev
npm run build            # vite build
npm run preview          # vite preview
npm run lint             # eslint .
npm run format           # prettier --write .
npm run test             # vitest run
npm run test:e2e         # playwright test
```

## CI Pipeline (`.github/workflows/ci.yml`)
Runs on push/PR. Jobs:
1. **contracts** — Node 22/24, `npm ci && compile && test`
2. **gas-report** — PR only, comments gas report on PR
3. **frontend** — Node 22/24, `npm ci && test` (23 tests)
4. **lighthouse** — PR only, desktop preset, waits on port 4173
5. **e2e** — PR only, installs Foundry/Anvil, deploys via `e2e:setup`, runs Playwright (non-blocking)

**Node version**: Hardhat 3.9.1 requires Node ≥22.13.0 (Node 20 fails). Frontend deps (`@tanstack/react-start`, `pdfjs-dist`) also require ≥22.

## Hardhat Config Notes
- Networks: `hardhatMainnet` (default test), `baseSepolia`, `base`, `sepolia`, `anvil` (local E2E only)
- Anvil uses hardcoded default test accounts (safe, documented in config)
- Verification: Basescan only (blockscout/sourcify disabled)

## Backend Config
- `.env` required: `PINATA_JWT`, `FRONTEND_ORIGIN`, `PORT`, `ADMIN_UNPIN_KEY`
- JWT must be scoped to `pinFileToIPFS`/`pinJSONToIPFS` only (not admin)
- SQLite at `backend/data/backend.sqlite`

## Smart Contract Constraints (hard limits)
| Operation | Gas Limit |
|-----------|-----------|
| `createProject` | < 350,000 |
| `pledge` | < 120,000 |

- Uses `ReentrancyGuardTransient` (EIP-1153, requires Cancun+)
- `uint96` for amounts (packed storage)
- No deadline — project stays open until creator claims
- Refund available anytime before claim (individual, no loops)
- Custom errors (not `require(string)`) for gas savings
- State-changing functions at end of file (convention)

## Language Convention
- **All code, files, comments, commits, root README**: English
- **Only `/docs`**: Spanish (communication channel with Abraham)

## Testing Notes
- Contract tests: `test/Crowdfunding.ts`, `test/ReentrancyAttack.ts`, `test/PledgeFuzz.ts`
- Backend tests: `backend/src/*.test.ts` (vitest + supertest)
- Frontend tests: 23 tests covering permissions, status, txErrors, useProjects
- E2E: Playwright + Anvil (requires Foundry installed)