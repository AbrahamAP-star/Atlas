# Incident Runbook — Post-Mainnet-Deploy

**Origin:** `09_ROADMAP_MEJORAS.md` § 10 (mainnet contingency plan). Option A executed (pure documentation, no contract changes). Option B (external audit) remains pending Abraham/Claudio's decision — see § 5.

**Precondition unchanged by this document:** `Crowdfunding.sol` has no `onlyOwner`/pause (`02_SMART_CONTRACT_SPEC.md`) — a correct, deliberate security decision (avoids team rug-pull). Direct consequence: **no scenario below allows "freezing" the contract** — the only real lever is fast communication + deploying a corrected contract.

**Inherent limitation, no runbook can fix it:** funds already claimed (`claimed == true`) before a bug is detected aren't recoverable this way — the creator already withdrew them from a non-custodial contract.

## 1. How an incident is detected
- **On-chain event monitoring** (minimal viable, no new infra): a simple listener over `ProjectCreated`/`Pledged`/`FundsClaimed`/`Refunded`/`ProjectDeleted` on the mainnet contract (e.g. `viem.watchContractEvent` as a script/cron, not a new service).
- **External report:** Claudio or a backer reports unexpected behavior (wrong amount, unexplained revert, `refund`/`claimFunds` failing).
- **Internal finding:** a new test or code review exposes a bug before exploitation (same pattern as the real `TxWatcher` bug, see `05_CRITICAL_REVIEW.md`).

On any of these: go to § 4 (incident log) **before** taking any corrective action.

## 2. Failure scenarios mapped to real contract functions

### 2.1 Bug in `pledge`
Impact: affects anyone pledging *after* the bug is detected. Immediate action: tell Claudio to stop promoting the "pledge" link while investigating — there's no technical way to block `pledge` on the old contract (no `Pausable`), the only real barrier is redirecting traffic away. Frontend: hide the "Pledge" button via a config flag (e.g. `VITE_PLEDGE_DISABLED=true`) — **not real protection** (anyone can call the contract directly), just stops facilitating the mistake for good-faith UI users while a redeploy is prepared.

### 2.2 Bug in `claimFunds`
Impact: creators with `isSuccessful == true` who haven't claimed yet. Immediate action: identify affected projects (loop `getProject` or accumulated events), contact those creators directly, instruct them **not to call `claimFunds`** until further notice. Note: if the bug is specifically in the transferred-amount calculation, a creator who already claimed with the bug active has no way to reverse that transaction — irreversible by blockchain design.

### 2.3 Bug in `refund`
Impact: the most urgent of the 4 — affects any backer of an unsuccessful project, at any time before claim. Immediate action: instruct **all backers with an active pledge** to attempt `refund` immediately, before the corresponding creator calls `claimFunds` (if the bug lets both coexist badly). Prioritize communicating this scenario over the other 3.

### 2.4 Bug in `deleteProject`
Impact: lowest direct financial urgency (already designed to revert if `pledged > 0 && !claimed`, see `05_CRITICAL_REVIEW.md`), but a bug here could leave a project in an inconsistent ghost state. Immediate action: disable the "Delete project" button in the frontend (same flag pattern as § 2.1) until the bug's real scope is confirmed.

## 3. Communication chain
1. **Abraham** detects/receives the report → logs the incident (§ 4) → notifies **Claudio** via their established channel (not formally defined in any project doc yet — **pending**: Claudio and Abraham must agree on a fixed channel, e.g. WhatsApp/email, *before* going to mainnet, not during an incident).
2. **Claudio** approves the message to backers (it's his product/brand, not a technical decision).
3. **Communication to backers:** via whatever external channels the campaign already uses (social media, email list if one exists) — the contract has no way to notify backers on-chain, so this step depends 100% on channels outside the project. **Accepted risk:** a backer not following those channels may not find out in time — no technical mitigation possible without a notification system that doesn't exist today.

## 4. Incident log (minimum checklist, fill per event)
```
Detection date/time:
Affected function (pledge / claimFunds / refund / deleteProject):
Bug's tx hash (if applicable, first observed occurrence):
Affected projects (IDs):
Estimated funds at risk:
Detection method (monitoring / external report / internal finding):
Action taken:
Owner:
Status (open / mitigated / closed):
```
Save each incident as `docs/incidents/YYYY-MM-DD-<slug>.md` (folder to create on the first real incident).

## 5. Manual migration (no automatic fund migration)
**What it DOES:** recreates active campaigns' registry on a new, corrected contract, preserving `metadataCID` (IPFS metadata doesn't change).
**What it DOES NOT do:** move funds. Old-contract funds only leave via that same contract's `refund`/`claimFunds` — there is (and shouldn't be) a function moving ETH between contracts without going through its legitimate owners.

### `scripts/migrate-projects.ts` spec (not implemented yet — spec for when authorized)
1. Read all old-contract projects: `getProject(id)` looped from `0` to `nextProjectId`.
2. Filter migration candidates: `creator != address(0)` (not deleted) and `!claimed` (already-claimed projects finished their lifecycle, nothing to migrate).
3. Per candidate: call `createProject(goal, metadataCID)` on the **new** contract, using the original creator's own wallet (requires the creator to sign their own tx — this script can't sign on behalf of third parties).
4. **`pledged` is NOT transferred:** the new project starts at `pledged = 0`. Old-contract backers must (a) `refund` on the old contract (recover their ETH), and (b) optionally re-pledge on the recreated project in the new contract. This is an accepted design limitation, not a script bug — there's no safe way to "copy" balances without the old contract custodying funds it no longer controls.

## 6. Decisions pending Abraham/Claudio (not assumed by this document)
| Point | Status |
|---|---|
| Option B (professional external audit before mainnet) | **Pending explicit decision** — Claudio's budget call, not technical. This runbook doesn't replace it: it reduces the *after*, not the *before*. |
| Option C (Pausable + multisig) | Rejected on technical recommendation (`09_ROADMAP_MEJORAS.md` § 10) — reintroduces a privileged role over a contract explicitly designed not to have one. Not to be revisited unless A proves insufficient (a real incident where the lack of pause caused avoidable loss). |
| Fixed Abraham↔Claudio↔backers communication channel | **Not defined.** Must be agreed before mainnet deploy, not during an incident. |

## Source of applied security criteria
No `onlyOwner`/pause: `02_SMART_CONTRACT_SPEC.md` § "Why the contract can never get stuck". Pull-payment pattern / `claimFunds` irreversibility: `01_ARCHITECTURE.md` § 1. Precedent of redeploy without fund migration (same mechanism, testnet): `05_CRITICAL_REVIEW.md` § "deleteProject" and § "Decision reversed... minimal backend" (same "new deploy, new address, `.env` updated" pattern).
