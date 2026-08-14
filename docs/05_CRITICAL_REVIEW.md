# Critical Review of the Original Proposal

## Contradictions detected
1. **"As much on-chain as possible" vs. "shouldn't be huge/complex":** putting frontend/IPFS content (e.g. images) on-chain would blow the 350k/120k gas budget with no real value (nobody reads HTML from a block explorer). Decision: only financial logic on-chain; presentation off-chain (static React) + IPFS for metadata. This IS "decentralized" where it matters (fund custody) without bloating gas.
2. **"State-changing functions at the end of the file, after loading everything correctly":** valid readability convention, but adds no real security by itself — Solidity's textual function order doesn't affect runtime or prevent attacks. CEI + `nonReentrant` is what actually prevents reentrancy. Kept for readability, not sold to the client as a security measure.
3. **Hard gas limits (350k/120k) calculated for L2:** on L1 mainnet these would be generous for `createProject` but tight for `pledge` with an unoptimized nested mapping slot. `uint96`/`uint40` struct packing into one slot is what makes hitting 120k consistently viable.

## Gaps the client didn't mention but are necessary
- Creator creates a project, never gets backers: covered — `refund` doesn't apply (nothing to refund), no stuck funds since none were deposited.
- Front-running on `claimFunds`: mitigated — only `creator` can call it and the amount is already fixed on-chain, no oracle/price-manipulation window.
- `uint96` divisibility: if ERC-20 with 18 decimals and large amounts is ever supported, `uint96` could fall short — documented as future adjustment in `02_SMART_CONTRACT_SPEC.md`, not a current bug.

## Recommendation (not explicitly requested, improves the proposal)
Added a Phase 2 "grief" test: same backer pledging 0 repeatedly, checking for broken events/calcs. Free to add, closes a UX/log-noise confusion vector. **Resolved at the root** in Phase 1: `msg.value == 0` is simply rejected (`ZeroPledge`).

## Real bug found and fixed (2026-07-20): `TxWatcher` lost the eth_call-replay-decoded error name
Found while writing `TxTrackerContext.test.tsx`, not by static code reading — a real async-mock test (`mockRejectedValue`) exposed an invisible race condition.
**The bug:** `TxWatcher` resolved `"error"` in two passes — an immediate generic message (before the `eth_call` replay finished), then a second pass with the decoded custom-error name. `TxTrackerProvider` only keeps a `TxWatcher` mounted while a hash's status is `"confirming"`/`"pending"`. The first pass already set status to `"error"`, removing the hash from `unresolvedHashes` and unmounting `TxWatcher` on the next render — the cleanup set `cancelled = true` **before** the real network round-trip (hundreds of ms in production) resolved. Result: the decoded error name never applied; users always saw the generic message instead of the readable mapped one (e.g. "Project already claimed"). The documented eth_call-replay feature was effectively dead for any real error.
**Fix:** consolidated into one async flow — the replay attempt is `await`ed **before** calling `onResolve("error", ...)`, so status goes straight from `"confirming"` to the final correct message, no intermediate step triggering premature unmount. Removed the now-unneeded local `replayedErrorName` state. Behavior unchanged for success/pending/confirming.
**How found:** the test kept failing with the generic message even with `waitFor` (1s timeout); investigating why (not adjusting the test to pass) traced it to the premature unmount above — confirmed by fixing the source, not the test.

## Bugs found and fixed implementing Phase 1 (2026-07-05)
1. `isSuccessful`/`isExpired` on a nonexistent `id` returned `true`/zeroed comparisons (`pledged=0 >= goal=0`) — a never-existing project looked "successful". Fix: `_requireProjectExists` on every `id`-taking function.
2. `uint256 → uint96`/`uint40` conversion without `SafeCast` silently truncates instead of reverting (Solidity 0.8 only does checked arithmetic on ops, not explicit casts). Fix: `SafeCast.toUint96`/`toUint40` everywhere.
3. `goal == 0` broke success semantics (see #1). Fix: `require(goal > 0)` via `InvalidGoal`.
4. This document's own "grief test" recommendation was resolved at the root: `msg.value == 0` is now rejected directly (`ZeroPledge`), eliminating the event-noise vector instead of just documenting it.

## Manual review — Phase 2 (2026-07-06)
`02_SMART_CONTRACT_SPEC.md` § Security checklist verified line-by-line against real code — all OK (CEI, nonReentrant/ReentrancyGuardTransient verified with a real attack test, no `transfer`/`send`, no unbounded loops, deadline validated at creation, no platform fee by design).

**New findings from this review:**
1. `isExpired`'s boundary is strictly-greater, not ≥ — at `block.timestamp == deadline` a project still accepts pledges. Consistent with spec but untested at the exact boundary — added in `test/PledgeFuzz.ts`.
2. `pledges[id][backer]` summed in `uint96` can overflow if a backer nears the max and pledges again — Solidity 0.8's checked arithmetic (panic 0x11) reverts correctly, no silent wraparound. Confirmed with a dedicated test.
3. `SafeCast.toUint96` in `pledge` had never been exercised with a real out-of-range value (Phase 1 tests only used small amounts) — added a forced-balance test for the real revert.
4. Also tested the attacker creating their own project (as `creator`) to attack `claimFunds`: the guard blocks it identically — being the creator gives no reentrancy advantage.

## Slither — executed (2026-07-07)
Native `slither-analyzer`/`solc` binaries weren't reachable in the analysis sandbox (no access to `binaries.soliditylang.org`), so `slither-analyzer` was installed via pip and compilation done with `solc-js` (`solc@0.8.28` npm package) in `--standard-json` mode, all OZ 5.6.1 imports manually inlined (no remappings — `solc-js` CLI can't resolve `node_modules/` via an import callback). Analyzed `Crowdfunding.sol` + `ReentrancyAttacker.sol` together. **19 findings across 6 detector categories, none critical or requiring a code change:**

| Detector | Where | Real severity | Why it doesn't apply / already mitigated |
|---|---|---|---|
| `reentrancy-benign` | `ReentrancyAttacker.receive()` (test mock only) | None | Part of the attack mock (`test/ReentrancyAttack.ts`), writes diagnostic vars after an external call but never moves funds; not deployed. |
| `timestamp` | `_isSuccessful`/`_isExpired` | Informational | Expected/documented use of `block.timestamp` for day/week-scale deadlines; miner manipulation is second-scale, doesn't change a campaign's outcome. |
| `assembly` | `TransientSlot.sol`/`SafeCast.sol` (OZ code) | None | Audited OZ library internals, not project code. |
| `pragma` (mixed versions) | `SafeCast.sol` `^0.8.20` vs. rest `^0.8.24` | Informational | OZ's own file pragma; the project actually compiles everything with solc `0.8.28`. |
| `solc-version` | Same `^0.8.20` in `SafeCast.sol` | False positive here | Detector flags known bugs in *old* solc versions matching that pragma; real compiler used (`0.8.28`) already fixes them. |
| `low-level-calls` | `.call{value}()` in `claimFunds`/`refund` | Already justified | Explicit design choice (avoids `transfer`/`send`'s EIP-1884 2300-gas limit), CEI + `nonReentrant` as mitigation. |

**Conclusion:** no new/real vulnerability found. All 19 results are third-party (OZ) library noise or already-documented, justified patterns. No code changes made.
**Environment note:** the sandbox this ran in lacked access to `binaries.soliditylang.org` (only `pypi.org`/`registry.npmjs.org`/`github.com`), hence the `solc-js` workaround. Running Slither locally in WSL with a native `solc` shouldn't need any of this — `slither contracts/Crowdfunding.sol --solc-remaps @openzeppelin=node_modules/@openzeppelin`.

## Critical review — Phase 5 (2026-07-08): uploading metadata to IPFS from the browser
Real, not hypothetical, problem: Phase 5 needs to upload campaign metadata to IPFS before calling `createProject`, and at the time there was no backend to proxy/hide credentials — only two real options: (1) upload directly from the browser with an embedded Pinata key (implemented then, mitigated with a scope-restricted key limited to `pinFileToIPFS`/`pinJSONToIPFS`, no admin permissions — worst case of a leaked key is quota abuse, not deletion/listing of other content); (2) add a minimal backend/serverless proxy (more secure, but out of Phase 5's declared scope at the time — the client's overview described Hardhat + static frontend, no own server, and it wasn't explicitly requested then). Kept as a recommended future improvement.

## Decision reversed (2026-07-10): Option 2 implemented — minimal backend
Abraham authorized and the dismissed Option 2 above was implemented: a minimal Express `/backend`, the only holder of `PINATA_JWT`. Two endpoints (`/api/pin-file`, `/api/pin-json`); frontend now calls `VITE_BACKEND_URL` instead of Pinata directly. Minimal controls: CORS restricted to one origin, server-side MIME whitelist, 10 MB limit (client-side validation is UX only, evadable). **Deliberately not implemented at the time:** caller authentication, rate limiting, quota — critical because the Pinata account is free tier (1 GB total); anyone reaching the endpoint could exhaust it (addressed in the "wallet auth + daily limit" work, see `04_STATUS.md`). Why the backend became worth it now: the risk surface shifted from "anyone can read the JWT from the bundle" (high risk, no client-side mitigation possible) to "anyone can call the endpoint without limit" (medium risk, mitigable — bounded, pending work). Still simpler than a full backend with DB/users: just a validating proxy, no persistent state of its own (until the SQLite work later).

## New function: `deleteProject` (2026-07-16)
Abraham requested a way for a project creator to delete it regardless of whether funds were withdrawn. Risk analysis before implementing:
**Why an unconditional delete would be a critical bug:** `delete projects[id]` resets `pledged` and `claimed` to their defaults. If deletion were allowed with `pledged > 0 && !claimed` (unclaimed backer funds still in the contract), any backer calling `refund` afterward would push `pledges[id][backer] > 0` against an already-zeroed `project.pledged` — the subtraction `project.pledged -= amount` would underflow (Solidity 0.8 checked arithmetic, panic 0x11) and **always** revert, permanently locking that ETH in the contract, violating the hard "no route for funds without an exit" rule.
**Decision:** `deleteProject` only allowed if `pledged == 0` (never any pledges, or all backers already refunded) or `claimed == true` (creator already withdrew everything; any backer who didn't refund before the claim already lost that path regardless — deleting afterward doesn't make it worse). New error `ProjectHasActiveFunds` for the blocked case.
**Side effect found and fixed:** after a `delete`, `creator` resets to `address(0)` but `id < nextProjectId` still holds, so `_requireProjectExists` alone doesn't detect the deletion — without an extra check, `pledge(id)` could still be called on a "deleted" project (funds unclaimable by anyone but still refundable, a confusing ghost state, though not a fund-loss bug). Fixed by extending `pledge`'s existing check: `if (projects[id].claimed || projects[id].creator == address(0)) revert ProjectClosed(id);`.
**Frontend:** "Delete project" button in `ProjectDetail.tsx`, visible only if `isCreator && (project.claimed || project.pledged === 0n)` (same exact criteria as the contract), `window.confirm` since irreversible. Listing filters out `creator == address(0)` projects. New `useDeleteProject.ts` hook, same pattern as `useRefund`/`useClaimFunds` (explicit gas: 120_000n, no external interaction).
**Tests added:** happy path (no pledges + with prior claim), `ProjectHasActiveFunds` revert (confirming the backer can still `refund` normally), delete after full refund, `NotProjectCreator`/`ProjectNotFound` reverts, deleted project rejects `pledge`.
**IMPORTANT — required a redeploy:** bytecode changed (new function/error/event, extra `pledge` check). The Sepolia contract deployed before this did NOT have `deleteProject` until redeployed with a new `IGNITION_DEPLOYMENT_ID` (Ignition doesn't redeploy over an existing complete journal for the same network id).
