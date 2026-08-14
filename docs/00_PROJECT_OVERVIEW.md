# Project Overview — Decentralized Crowdfunding Platform

## Business context
Client: small non-technical company. Needs to raise capital without banks/centralized platforms. Any wallet must be able to contribute; funds must be protected from bad faith (can't "disappear").

## Technical goal
On-chain crowdfunding dApp: campaign creation, wallet pledges, fund custody in contract (not an admin), funds released only if goal met, refund available otherwise.

## Acceptance requirements
- [x] Main smart contract
- [x] Full React frontend — list/detail (Phase 4) + create/pledge/claim/refund (Phase 5)
- [x] Wallet connection (MetaMask via Wagmi/Viem)
- [ ] L2 deploy
- [ ] Automated tests (Hardhat + Chai)
- [ ] Technical docs
- [ ] End-user README

## Hard constraints (non-negotiable)
| Constraint | Limit |
|---|---|
| Gas: create project | < 350,000 |
| Gas: pledge | < 120,000 |
| Known critical vulnerabilities | 0 |
| Permanent contract lock | Forbidden (must have an exit for funds) |
| Event per relevant action | Mandatory |

## Stack (see 01_ARCHITECTURE.md for rationale/sources)
Solidity 0.8.24+/Hardhat, OpenZeppelin Contracts v5.5.x, React+TS, Wagmi v2+Viem+TanStack Query, MetaMask/EIP-6963, L2: Base (alt. Arbitrum/Optimism), IPFS for campaign metadata (CID stored on-chain).

## Code philosophy (client-imposed)
No global functions/vars that need editing to adapt the project — only function-internal constants. `uint`/`int` sized to the minimum needed range. `memory` by default for params; `calldata`/`storage` only when justified. State-changing functions declared last in the contract file. Reuse OpenZeppelin over reinventing. Simple, maintainable by a 2-person team, locally reproducible without touching logic.

## Deliverables
Single repo: `/contracts`, `/frontend`, `/backend`, `/scripts`, `/test`, `/docs`. `/backend` is a minimal proxy to Pinata (hides the JWT, see `05_CRITICAL_REVIEW.md`), not a business backend — the contract remains the source of truth for funds. See `03_PLAN_FASES.md` for build order, `04_STATUS.md` for current status.

## Frontend visual upgrades (on-demand, non-blocking)
`06_FRONTEND_VISUAL_UPGRADE.md` is a reference map (not a sequential phase) of animations/hovers/elevation/glow/etc., consulted whenever a concrete visual effect is requested on top of the frontend already built in Phases 4/5.

## Post-review improvement roadmap
`09_ROADMAP_MEJORAS.md` tracks 14 points identified across evaluations (CI, real component/TxTracker test coverage, Phase 3 closure, persistent backend, IPFS SPOF, incident runbook, etc.), each with options to decide — not actions already executed. Check before assuming any area outside the checklist above is "done".

## Language convention (hard rule, non-negotiable — 2026-07-22)
**Everything outside `/docs` is in English**: code, filenames, functions, variables, types, code comments, commit messages, root `README.md`. No exceptions, even if a Spanish request comes in — translation to English is the responsibility of whoever writes the code, not optional.
**Only `/docs` used to be kept in Spanish**; as of 2026-08-14 `/docs` was translated to English too (compressed, no loss of relevant context) so any agent/human — technical or not — can understand the dApp and past decisions without a language barrier.
Any agent editing code must remember this rule before writing, not just when reading this file.
