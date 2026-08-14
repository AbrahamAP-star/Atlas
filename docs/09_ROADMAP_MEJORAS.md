# Improvement Roadmap — raising the project's grade

## How to use this document
Each point brings **options with trade-offs**, never an already-decided solution — same rule as `03_PLAN_FASES.md`: no execution without Abraham's explicit authorization. On choosing an option, fill in "Decision". On finishing implementation, set Status to `CLOSED (date) — <option> — <brief technical justification>`. This is the only place tracking these points' progress (`04_STATUS.md` stays the chronological session changelog).

## Origin
Points 1-8: project evaluation feedback (2026-07-19), right after closing frontend2.0 test coverage (grade 7→7.5/10). Points 9-14: a broader cross-cutting audit (2026-07-28) of product/continuity risks not captured by a phase checklist.

## Global status
| # | Point | Priority | Status |
|---|---|---|---|
| 1 | CI (GitHub Actions) | 🔴 Critical | CLOSED (2026-07-19) — Hybrid B+C |
| 2 | Base Sepolia deploy (real Phase 3 closure) | 🔴 Critical | PENDING — depends on Abraham (testnet funds) |
| 3 | Real component tests (RTL) | 🟠 High | CLOSED (2026-07-20) — Option A |
| 4 | `TxTrackerContext`/`useTxStatus` tests | 🟠 High | CLOSED (2026-07-20) — Option B |
| 5 | Backend: in-memory → persistent state | 🟡 Medium | CLOSED (2026-07-20) — Option A |
| 6 | `documentCID` not shown in `ProjectDetail` | 🟡 Medium | CLOSED (2026-07-20) — already implemented |
| 7 | Lighthouse / real-device validation | 🟡 Medium | CLOSED (2026-07-21) — see below |
| 8 | End-user README + technical startup doc | 🟢 Low | CLOSED (2026-07-22) — Option B |
| 9 | IPFS pinning redundancy (Pinata SPOF) | 🔴 Critical | PLANNED — §9, not executed |
| 10 | Post-mainnet-deploy contingency plan (no pause/upgrade) | 🔴 Critical | PLANNED — §10, not executed |
| 11 | Backend abuse hardening (IP rate limit + content moderation) | 🟠 High | CLOSED (2026-07-29) — Options A+C + tests (Vitest+Supertest, 15/15) |
| 12 | E2E tests with real wallet (Playwright + Anvil) | 🟠 High | IMPLEMENTED (2026-07-29) — no-Synpress variant, pending Abraham's real confirmation |
| 13 | Lighthouse CI: `warn` → `error` with a real baseline | 🟡 Medium | PLANNED — §13, not executed |
| 14 | UX analysis of the no-`deadline` model ("forgotten funds" risk) | 🟡 Medium | PLANNED — §14, not executed |

---

## 1. CI (GitHub Actions) — 🔴 Critical
**Why it matters:** 61 tests (38 Hardhat + 23 Vitest) with no guarantee they run before a merge.
**Options:** A) minimal 2-job CI, no cache. B) + dependency cache + Node matrix. C) + automated gas-report PR comment (relevant since 350k/120k is a hard client constraint).
**Decision (2026-07-19): Hybrid B+C.** Node matrix (no dep cache — unjustified for a small repo yet) + automated gas-report PR comment. `.github/workflows/ci.yml`, 3 jobs (`contracts`, `gas-report` on `pull_request` only, `frontend`). **Correction same day:** real matrix ended up `[22, 24]`, not `[20, 22]` — Hardhat 3.9.1 and frontend2.0's `@tanstack/react-start`/`pdfjs-dist` require Node ≥22.12/22.13 (full debug detail incl. real frontend2.0 lockfile root cause: `04_STATUS.md`).
⚠️ **Documented unresolved future risk:** frontend2.0's lockfile only stays stable because it was regenerated with a full `npm install` (not `--package-lock-only`). Most of its Lovable-scaffold deps use `^` ranges (against the project's pin-exact convention) — if the lockfile is ever regenerated from scratch, a new `nitro`/`unstorage` beta release could reproduce the same desync error. Not fixed now (out of requested scope).
**Fix (2026-07-27), 2 real CI bugs found on the first real PR:** (1) `gas-report` got 403 commenting on the PR — workflow had no `permissions:` block, default `GITHUB_TOKEN` was read-only; fixed by adding `permissions: {contents: read, pull-requests: write}`. (2) `lighthouse` job's `NO_FCP` — real cause: `npm run preview`'s stdout is buffered by npm's wrapper in a non-TTY CI runner, so LHCI never sees the `Local:` line in real time regardless of `startServerReadyTimeout`; fixed by using `npx vite preview --port 4173` directly (bypassing npm's wrapper); the 60s timeout kept as a secondary safety net.
### Status: CLOSED (2026-07-19)

---

## 2. Base Sepolia deploy — real Phase 3 closure — 🔴 Critical
**Why it matters:** architecture targets L2 (Base); currently operating on Ethereum Sepolia (L1) for lack of funds. If mainnet inherits this by inertia, per-tx cost balloons vs. what was promised.
**Options (Abraham executes, not this assistant):** A) Base's official CDP faucet. B) Bridge existing Sepolia ETH via `bridge.base.org`. C) Third-party faucets (Alchemy/QuickNode).
Once funded: `npx hardhat run scripts/deploy.ts --network baseSepolia` then `npx hardhat verify --network baseSepolia <ADDRESS>`.
### Decision: pending (depends on Abraham's availability, not a technical choice) — ### Status: PENDING

---

## 3. Real component tests (RTL) — 🟠 High
**Why it matters:** the 23 existing frontend2.0 tests were pure extracted logic + a mocked-wagmi hook — none mounted a real component/checked the DOM.
**Options:** A) happy-path per key component (`ProjectCard`, `ProjectDetail`). B) + forms (`CreateProjectForm`/`PledgeForm`). C) snapshot testing (rejected — low signal, noisy on style/copy changes).
**Decision (2026-07-20): Option A.** B rejected — forms need mocking IPFS auth + gas estimation, more mock surface for little added benefit. `ProjectCard.test.tsx` (4 tests), `ProjectDetail.test.tsx` (5 tests): all hooks mocked via `vi.mock`, `lib/projectPermissions.ts` kept real (goal: prove `ProjectDetail.tsx` passes correct props — exactly where the 2026-07-14 bug was). `PledgeForm` stubbed as a child. **Total frontend2.0: 32 tests.**
### Status: CLOSED (2026-07-20)

---

## 4. `TxTrackerContext`/`useTxStatus` tests — 🟠 High
**Why it matters:** the piece that fixed the project's worst lifecycle bug (components unmounting mid-tx losing the result) had zero tests.
**Options:** A) isolated reducer/logic test (cheap, doesn't prove real integration). B) integration test: provider + consumer, mocked wagmi, including unmount/remount. C) accept the risk, document as known debt.
**Decision (2026-07-20): Option B.** A wouldn't have proven the real guarantee (survives unmount mid-tx); C rejected — highest-impact piece with zero coverage. `TxTrackerContext.test.tsx` (5 tests): central test is a `Consumer` unmounting mid-tx while `TxTrackerProvider` keeps resolving, a newly-mounted `Consumer` seeing the already-resolved result without re-`track()`ing — reproduces the real 2026-07-14 bug. Also covers confirming→success, localStorage persistence/rehydration, error resolution via eth_call replay. `useTxStatus.test.ts` (5 tests). **Total frontend2.0: 42 tests.**
**Real bug found and fixed during this session:** `TxWatcher` resolved errors in two passes, causing premature unmount before the eth_call replay's decoded error name could apply — see `05_CRITICAL_REVIEW.md` for full detail.
### Status: CLOSED (2026-07-20)

---

## 5. Backend: in-memory → persistent state — 🟡 Medium
**Why it matters:** `nonceStore`/`sessionStore`/rate limiter were `Map`s — reset on every restart, don't scale beyond one instance.
**Options:** A) SQLite (`better-sqlite3`), local file, no new infra. B) Redis — industry standard, supports multiple instances, but new infra the current volume doesn't justify. C) accept the risk, do nothing yet.
**Decision (2026-07-20): Option A.** B rejected (no real multi-instance need today); C rejected (A is cheap and closes a real dev-time pain: every restart invalidated active sessions). `backend/src/db.ts` (single `backend/data/backend.sqlite` file, WAL mode, periodic cleanup). `nonceStore`/`sessionStore`/`rateLimiter` rewritten on SQLite, same public API. New dep `better-sqlite3@12.11.1`.
**Documented remaining limitation:** still not shared across multiple backend instances (would need Option B/Redis if ever scaled horizontally).
### Status: CLOSED (2026-07-20)

---

## 6. `documentCID` not shown in `ProjectDetail` — 🟡 Medium
**Decision (2026-07-20): already resolved, no option needed.** Confirmed against real code: `ProjectDetail.tsx` already renders `documentUrl` (from `useProjectMetadata`) as a "view attached document" link, same pattern as the raw-JSON link, implemented in the 2026-07-16 "Fix" session. This roadmap point was just stale vs. the code; only the `03_PLAN_FASES.md` checklist needed updating.
### Status: CLOSED (2026-07-20) — already implemented, no new work

---

## 7. Lighthouse / real-device validation — 🟡 Medium
**Why it matters:** hero/marquee has documented hard requirements (60fps, `prefers-reduced-motion`, Lighthouse ≥95) never actually measured.
**Options:** A) one-off manual measurement (Abraham runs build+preview+Lighthouse once, no regression protection). B) Lighthouse CI in the pipeline with thresholds that fail CI on regression (needs point 1/CI to exist first — real long-term protection).
**Finding (2026-07-21):** Lighthouse CLI/DevTools reproducibly fail with `NO_FCP` on this specific WSL machine in every mode (headless/headed, sandbox on/off) — confirmed via DevTools Performance (CPU 4x + Slow 4G + incognito) that the page **does** paint correctly under those same conditions, ruling out a real app bug; it's this environment's Lighthouse runner, not the code. Two real issues found and fixed along the way regardless: `Hero.tsx` above-the-fold content depended on a post-hydration `IntersectionObserver` to become visible (`.reveal` → new `.reveal-immediate` pure-CSS variant for above-the-fold content); `DemoSection` (mounts wagmi/viem/`AppShell`) was statically imported into the landing's critical chunk (349KB → separated + lazy-loaded, down to 23KB).
**Implemented (2026-07-21): Option B.** New `lighthouse` CI job (`pull_request` only), `npx @lhci/cli@0.15.1 autorun` against a build the job itself boots. `.lighthouserc.json` thresholds left at **`warn`, not `error`** (0.9 min) — deliberately, since no confirmed real local baseline existed yet; `numberOfRuns: 1` to keep the job fast. Results uploaded to LHCI's free temporary public storage (no self-hosted dashboard, consistent with "minimal backend").
**Fix (2026-07-27), 2 real CI bugs from the first real PR:** see point 1 above (same session).
### Status: CLOSED (2026-07-21) — Lighthouse still broken locally on this machine (see finding above), but no longer blocking: real measurement now lives in CI.

---

## 8. End-user README + technical startup doc — 🟢 Low
**Options:** A) wait for Phase 6 as originally planned. B) bring forward only the technical README (local run instructions), leave the end-user one for Phase 6 (depends on final production URLs/addresses that don't exist yet).
**Decision (2026-07-22): Option B.** Implemented root `README.md` (contracts, backend, frontend2.0, CI, doc links). Found and fixed a real gap while writing it: `backend/.env.example` **didn't exist** (only mentioned in `04_STATUS.md`) — created it.
### Status: CLOSED (2026-07-22) — Option B

---

# Additional critical review (2026-07-28)
Origin: a cross-cutting audit of the whole project's docs (not feedback on one task) requested by Abraham. Identified 6 gaps not in the original 2026-07-19 roadmap because they're **product/continuity** risks, not "missing test coverage"/"missing minor infra". **Rule for this section, explicit at Abraham's request:** document and plan first, execute nothing yet — same on-demand activation criteria as the rest of this doc.

---

## 9. IPFS pinning redundancy (Pinata SPOF) — 🔴 Critical
**Why it matters:** the Pinata account is free-tier (1 GB). Undocumented anywhere: what happens if Pinata takes content down, has a prolonged outage, or the account is suspended (e.g. from quota-abuse per point 11's gap) — every existing campaign's image/description/document disappears from the UI (the CID stays valid on-chain, but nothing serves those bytes). Contradicts the "decentralized" pitch: funds are decentralized, metadata today is a single free provider with no backup.
**Options:** A) dual-pin Pinata + web3.storage (Storacha) in parallel (`Promise.allSettled`, needs verifying CIDs actually match between providers first). B) periodic verification-only script (`scripts/check-pins.ts`, HEAD requests, no second provider — detects but doesn't fix). C) self-hosted Kubo node as a third pin (highest cost, new infra to maintain — rejected unless A+B prove insufficient).
**Recommendation (Abraham to decide, not executed): A+B combined** — dual-pin as the real mitigation, verification script as an early-warning net.
**Execution plan when authorized:** 1) isolated POC confirming CIDs match between Pinata/web3.storage (the assumption A depends on). 2) web3.storage account/scoped key. 3) `backend/src/storacha.ts` (same pattern as `pinata.ts`). 4) `index.ts`'s pin endpoints fire both uploads in parallel, succeed if at least one does. 5) `scripts/check-pins.ts` (reads on-chain projects, HEADs both gateways per `metadataCID`, reports orphans). 6) weekly-cron CI job `ipfs-health-check`.
**Tests required:** `storacha.ts` unit test (mocked fetch: success/fail/timeout); `/api/pin-file` integration test for all 4 both/one/other/none-succeed combinations; `check-pins.ts` test with a simulated orphaned CID.
**Closure checklist:** POC confirmed / adjustment documented · dual-pin working · `check-pins.ts` run clean against real Sepolia projects · weekly CI job green · closure entry with the real (not assumed) POC result.
### Decision: pending Abraham's authorization — ### Status: PLANNED — not executed

---

## 10. Post-mainnet-deploy contingency plan (no pause/upgrade) — 🔴 Critical
**Why it matters:** `Crowdfunding.sol` deliberately has no `onlyOwner`/pause (avoids team rug-pull) — correct decision, but nothing documents what to do if a critical bug appears post-mainnet with Claudio's and backers' real funds already deposited. Redeploys so far were all on testnet with no real funds and no fund-migration process.
**Options:** A) incident runbook (pure documentation, zero contract change — doesn't solve funds already claimed before detection, an inherent limitation of a non-custodial contract). B) professional external audit before mainnet (highest cost, Claudio's budget decision, reduces the need for A without replacing it). C) limited `Pausable` (OZ) on `createProject`/`pledge` only (never `refund`/`claimFunds`), multisig-controlled (highest design-risk cost — reintroduces a privileged role, requires a full new security pass).
**Recommendation: A mandatory minimum before any mainnet deploy** (pure docs, no real trade-off to debate). B is Claudio's budget call. C rejected unless A+B prove insufficient — changes the contract's core guarantee and shouldn't be taken lightly.
**Execution plan (Option A only):** 1) map failure scenarios against real functions (`pledge`/`claimFunds`/`refund`/`deleteProject`). 2) for each: detection method, who/how to notify, exact action sequence. 3) manual migration process spec: `scripts/migrate-projects.ts` reading old-contract projects and recreating them (`createProject`) on the new contract, preserving `metadataCID` — funds are NOT auto-migrated, must be claimed/refunded on the old contract first, this only recreates the campaign registry. 4) incident-log checklist fields.
### Decision: pending Abraham's authorization — ### Status: PLANNED — not executed. **→ Executed as `10_INCIDENT_RUNBOOK.md`, Option A only; see that file. Option B still pending Abraham/Claudio's explicit decision.**

---

## 11. Backend abuse hardening (IP rate limit + content moderation) — 🟠 High
**Why it matters:** per-IP rate limiting is trivially evadable (VPN, free new wallets — a signature proves wallet control, not unique identity). Undocumented additional gap: the backend never validates upload *content*, only MIME/size — nothing stops illegal/abusive content inside a valid PDF/image, permanently pinned under Abraham's Pinata account (real legal/reputational risk, not just quota).
**Options:** A) combined IP+wallet-address rate limit (cheap, extends the existing SQLite quota table). B) CAPTCHA/proof-of-work before issuing a session (more user friction, new external dependency). C) manual report/flag + periodic review (script listing recent CIDs for manual review + an emergency "unpin" admin endpoint, separate credential) — no automatic prevention, only fast reaction.
**Recommendation: A always** (cheap, closes a real gap, no UX friction). **C as a governance minimum** (need *some* emergency-removal mechanism before exposing the backend outside `localhost`). B only if A+C prove insufficient.
**Decision (2026-07-29): A + C, authorized and executed.** `backend/src/db.ts`: separate `quota_usage_address` table (not a bolted-on column — `quota_usage`'s PK is `ip`, avoids a secondary index/shared-counter collision; combining logic lives in `rateLimiter.ts` alone). Also added `upload_log` (upload auditing) and `admin_actions` (unpin-endpoint auditing). `rateLimiter.ts`: `hasQuota(ip, address)`/`consumeQuota(ip, address)`, blocks if either is exhausted. `auth.ts`: `requireAdminKey` middleware (`X-Admin-Key` vs. a separate `ADMIN_UNPIN_KEY` env var, never reusing `PINATA_JWT`/session tokens). `pinata.ts`: `unpinFromIPFS(cid)`. `auditLog.ts` (new): `logUpload`/`listUploadsSince`/`logAdminAction`. `index.ts`: `/api/auth/verify` uses the combined quota check; upload endpoints log each success; new `POST /api/admin/unpin`. `backend/scripts/audit-uploads.ts` (lives in `backend/scripts/`, not the repo-root `scripts/`, to reuse `better-sqlite3` without adding it to the Hardhat package) + `npm run audit:uploads`. New `ADMIN_UNPIN_KEY` env var (real 32-byte value generated for Abraham's local `.env`). B (CAPTCHA/PoW) deliberately deferred per this doc's own recommendation.
**Documented remaining limitation (not an oversight):** IP+address combined is still evadable by an attacker rotating both together (VPN + new wallet each attempt) — costlier than evading just one, not a hard barrier.
**Closure checklist:** ✅ combined rate limit working+tested · ✅ emergency unpin endpoint working, documented, separate credential · ✅ audit script run against real data (2026-07-29, confirmed: 3 real uploads listed correctly) · ✅ README documentation · ✅ required tests.
**Test framework added:** **Vitest 4.1.10 + Supertest 7.2.2** (backend's first test framework). Chosen over Jest/`node:test` because `vi.mock` handles TS/ESM module mocking (needed for `pinata.ts` in the unpin endpoint test) without extra config, unlike Jest (needs experimental ESM flags per jestjs.io) or `node:test` (ES module mocking still experimental per nodejs.org). Minimal testability changes, no behavior change: `index.ts` now exports `app`, only calls `.listen()` when run directly; `audit-uploads.ts` similarly guarded, with `parseHoursArg`/`formatRow` exported as pure functions.
**15 new tests, confirmed green by Abraham (2026-07-29):** `rateLimiter.test.ts` (5, isolated temp SQLite), `admin.test.ts` (5, Supertest + `vi.mock` on `pinata.ts`: no/wrong/correct admin key, missing `cid`, Pinata-failure 502), `audit-uploads.test.ts` (5, pure functions + seeded-SQLite integration).
### Status: CLOSED (2026-07-29) — Options A+C implemented + automated tests (Vitest+Supertest, 15/15, confirmed by Abraham)

---

## 12. E2E tests with a real wallet (Playwright + Anvil) — 🟠 High
**Why it matters:** E2E was previously explicitly ruled out of scope. But the project's **two worst bugs** (`canClaim`/`canRefund` never activating due to a ghost `isExpired`, and the broken `toProject` destructuring) both occurred exactly at the frontend↔contract integration layer — precisely what RTL/Vitest mocks don't exercise. Keeping E2E excluded after finding two bugs there was inconsistent with the project's own evidence.
**Options:** A) Playwright + local Anvil fork, full happy path (crate project→pledge from a 2nd wallet→claim→verify UI state); recommended library for the simulated wallet: `@synthetixio/synpress` (automates real MetaMask via Playwright) — setup cost is high, maintenance cheap afterward. B) Playwright against real Sepolia testnet — slower (real block times ~12s), depends on third-party RPC availability and testnet ETH, more fragile for per-PR CI; rejected as the primary option.
**Recommendation: Option A**, run as a separate, initially non-blocking CI job (same pattern used for Lighthouse), promoted to blocking once stable.
**Decision (2026-07-29): a variant of Option A — Playwright + Anvil, without Synpress.** `wagmi` uses `injected()` (generic EIP-1193), so automating real MetaMask would test a third party's UI, not the frontend↔contract integration where the real bugs happened — high maintenance cost (MetaMask version churn) for no proximity to the real risk. Instead: a minimal `window.ethereum` injected via Playwright's `page.addInitScript`, backed by Anvil's own already-unlocked test accounts (Anvil signs `eth_sendTransaction`/`personal_sign` server-side, no private keys handled in-browser).
**Scope adjustment (decided while implementing, not originally planned):** instead of running a real `/backend` with real Pinata credentials, its 4 auth/IPFS endpoints + the Pinata gateway are network-mocked (`page.route`) — IPFS pinning isn't where the real bugs occurred; requiring a real Pinata account just for CI E2E would have been a fragile external dependency for no benefit to the actual goal.
**Implemented:** `hardhat.config.ts`'s `anvil` network (public, non-secret Anvil test keys). `scripts/e2e-setup.ts` (new) + `npm run e2e:setup`: boots Anvil, deploys via `scripts/deploy.ts --network anvil`, writes `frontend2.0/.env.e2e.local`. `wagmi.ts`/`crowdfundingConfig.ts`: `foundry` chain (id 31337) added only when `VITE_E2E=true` — production never sees it. `e2e/fixtures.ts`: injected EIP-1193 provider + network mocks for auth/pin-file/pin-json/gateway (shared store between the two test wallets, so what the creator "pins" is readable by the backer, mimicking real IPFS). `e2e/happy-path.spec.ts` (create→pledge to exact goal→claim→"Claim funds" button disappears), `e2e/refund.spec.ts` (high-goal project→pledge→refund→button disappears + real wallet balance increase verified via `eth_getBalance`). `playwright.config.ts` + `@playwright/test@1.62.0` + `npm run test:e2e`. CI job `e2e` (`pull_request` only, `continue-on-error: true` — same non-blocking-at-first pattern as Lighthouse's initial version, installs Foundry via `foundry-rs/foundry-toolchain@v1`). `.gitignore`/README updated.
**Not verifiable from this analysis environment:** Foundry (`anvil`) isn't installed/installable here (confirmed `anvil --version` → command not found; its install domain is outside the sandbox's allowed network). Code written and reviewed but **unexecuted** — Abraham must run `npm run e2e:setup` then `npx playwright install chromium && npm run test:e2e` and confirm the real result.
**Closure checklist:** ✅ `e2e:setup` script written (unexecuted here) · ✅ 2 specs written (pending local confirmation) · ✅ CI job added (pending a real green run) · ✅ documented in README/`e2e/README.md`.
### Status: IMPLEMENTED (2026-07-29), pending Abraham's real confirmation (`npm run e2e:setup` + `npm run test:e2e`)

---

## 13. Lighthouse CI: `warn` → `error` with a real baseline — 🟡 Medium
**Why it matters:** point 7 (closed) left thresholds at `warn` because no confirmed local run existed at the time. With CI's job running since 2026-07-21, nobody has yet reviewed the real numbers it's been producing on every PR.
**Options:** A) review the Lighthouse history of PRs already run since 2026-07-21, take the worst result minus a margin (e.g. -3 pts) as the new threshold — free, no new runs needed. B) manually dispatch the job ~5 times first for more precision, slower.
**Recommendation: A first**; fall back to B only if too few historical runs exist.
**Execution plan when authorized:** 1) review all Lighthouse CI checks since 2026-07-21. 2) ≥3 runs → min observed minus 3-pt margin as new threshold. 3) <3 runs → Option B, same criterion. 4) `.lighthouserc.json`: `warn`→`error` at the computed threshold, `numberOfRuns` stays 1 unless step 3 shows high variance. 5) confirm with a test PR that the gate actually blocks a forced regression.
### Decision: pending Abraham's authorization — ### Status: PLANNED — not executed

---

## 14. UX analysis of the no-`deadline` model ("forgotten funds" risk) — 🟡 Medium
**Why it matters:** `02_SMART_CONTRACT_SPEC.md` documents the *technical* rationale for removing `deadline` well, but no doc evaluates the *user-behavior* side: without time pressure, (a) a backer can forget they pledged and never request a refund from a failing project, leaving ETH functionally "asleep" (still technically refundable, not contract-locked, but practically dormant), and (b) without urgency ("3 days left"), crowdfunding conversion rates tend to be lower (a known Kickstarter-style pattern). Not a security bug — a product risk Claudio likely didn't evaluate when requesting the change.
**Options:** A) UI-only: transparency/reminders, no contract change ("no activity in N days" banner, explicit refund-reminder for backers with an active pledge) — low cost, pure frontend, no contract-guarantee change. B) optional (not mandatory) deadline field re-added to the contract, `0`/absent meaning "no limit" — highest cost, reopens an already-simplified, already-audited contract, requires a full new Slither + manual review pass. C) do nothing, document the risk as consciously accepted.
**Recommendation (Abraham/Claudio's call — the only point here that's a product decision, not purely technical): A is a low-cost, no-downside minimum in any case. B only if Claudio confirms low-urgency conversion is a real, measured problem (not before — don't touch the contract on an untested hypothesis).**
**Execution plan (Option A only):** 1) new `usePledgeAge.ts` hook (or extend `useProjectMetadata.ts`): time since the most recent `Pledged` event (requires reading logs, not just the struct — consider limiting this to the detail view only, not the full listing, to avoid inflating `useProjects`' RPC cost). 2) `ProjectDetail.tsx`: non-blocking banner ("no contributions in the last N days") when applicable. 3) for the backer themself: explicit refund reminder if `pledgeOf(user) > 0 && !claimed` (reinforced wording on the existing button, not new logic).
**Tests required:** pledge-age calculation unit test (mocked logs); banner appears/doesn't per the configured day threshold.
**Closure checklist:** explicit A/B/C decision documented here (not assumed by the assistant) · if A: banner implemented+tested · if B: full new Slither+manual-review round before redeploy (same bar as Phase 2) · if C: closure entry explaining the accepted risk, so it's a conscious decision, not an omission.
### Decision: pending — requires Claudio's input, not just Abraham's — ### Status: PLANNED — not executed
