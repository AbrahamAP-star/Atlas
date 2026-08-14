# Smart Contract Spec — Crowdfunding.sol

## Data model (types sized to the minimum needed)
```solidity
struct Project {
    address payable creator;   // 20 bytes
    uint96 goal;                // wei of the MINIMUM amount that unlocks withdrawal (no longer "goal with deadline")
    uint96 pledged;             // total raised, also updated on refund
    bool claimed;                // whether creator already withdrew (withdrawal = project closes)
    string metadataCID;          // IPFS reference (description, image)
}
```
> **Model change (2026-07-09):** `deadline`/duration removed. A project has no closing date: it keeps accepting pledges indefinitely, even after reaching `goal`. The creator can call `claimFunds` at any time once the goal is reached — at their own discretion, no automatic closing. A project stops accepting pledges only once the creator claims (`claimed == true`) or deletes it (`deleteProject`, added 2026-07-16 — see `05_CRITICAL_REVIEW.md` § "deleteProject").
> `goal`/`pledged` as `uint96` assumes reasonable wei amounts for a small-to-mid crowdfunding. If campaigns of hundreds of thousands of ETH are expected (unrealistic), bump to `uint128` — exactly the kind of "internal variable" the team can adjust without touching logic.

## Storage
- `mapping(uint256 => Project) public projects` — incremental id (`uint32` is plenty).
- `mapping(uint256 => mapping(address => uint96)) public pledges` — per-wallet contribution per project (needed for individual refunds).

## Functions — reading order (client requirement: views first, state changes last)

### Views (no state change)
- `getProject(uint256 id) external view returns (Project memory)`
- `pledgeOf(uint256 id, address backer) external view returns (uint96)`
- `isSuccessful(uint256 id) external view returns (bool)` — `pledged >= goal`
- ~~`isExpired`~~ — removed, no deadline anymore.

### State changes (end of file)
- `createProject(uint96 goal, string memory metadataCID) external returns (uint256 id)` — budget **< 350,000 gas**. Single struct `SSTORE` + mapping push + event. No longer takes `durationSeconds`.
- `pledge(uint256 id) external payable nonReentrant` — budget **< 120,000 gas**. Updates `pledges` and `Project.pledged`. Never expires; only reverts if the project was already claimed (`ProjectClosed`).
- `claimFunds(uint256 id) external nonReentrant` — only `creator`, only if `isSuccessful && !claimed`. No expiry check: creator claims whenever they decide, any time after goal is reached. Pull pattern: transfers total to creator.
- `refund(uint256 id) external nonReentrant` — any backer, any time, only if `!claimed`. No longer depends on `isSuccessful`: it's the only exit for a backer who changes their mind before the creator claims. Also decrements `Project.pledged` (not just `pledges[id][backer]`), since the project can stay alive after a refund. Returns just the caller's own pledge (avoids "one backer blocks everyone's refund" by being individual, not looped).
- `deleteProject(uint256 id) external` **(added 2026-07-16)** — only `creator`. Only if `pledged == 0 || claimed`: disallowed while unclaimed pledges exist, so those backers keep a way to recover funds. Uses `delete projects[id]` (gas refund, `creator` resets to `address(0)`). `pledge` treats `creator == address(0)` as closed (`ProjectClosed`). Full justification in `05_CRITICAL_REVIEW.md` § "deleteProject".

## Why the contract can never get stuck
No route for funds without an exit: before claiming, any backer can `refund` at any time; once the goal is reached, the creator can `claimFunds` whenever they choose. No `onlyOwner` that can permanently pause withdrawals (avoids a "rug pull" by the dev team, exactly what the client asked to prevent). No loop over all backers anywhere (avoids gas-DoS as the backer list grows).

## Events (one per relevant action, client requirement)
```solidity
event ProjectCreated(uint256 indexed id, address indexed creator, uint96 goal);
event Pledged(uint256 indexed id, address indexed backer, uint96 amount);
event FundsClaimed(uint256 indexed id, uint96 amount);
event Refunded(uint256 indexed id, address indexed backer, uint96 amount);
event ProjectDeleted(uint256 indexed id);
```

## Security checklist
- [x] Checks-Effects-Interactions in `pledge`/`claimFunds`/`refund`
- [x] `nonReentrant` (OZ v5.5 `ReentrancyGuard`, stateless) as defense in depth
- [x] No `transfer`/`send` (avoids EIP-1884's 2300-gas limit) — `call` + pull pattern + `require(success)`
- [x] No loops over unbounded structures
- [x] ~~`deadline` validated against `block.timestamp` on creation~~ — n/a, no deadline anymore.
- [ ] Pending decision: platform fee? Not requested by client — not implemented, avoids extra complexity/attack surface.

## Implemented in Phase 1 (2026-07-05) — `contracts/Crowdfunding.sol`
Gaps found only while writing the real contract (also documented in `05_CRITICAL_REVIEW.md`):
- **`ReentrancyGuardTransient`** instead of classic `ReentrancyGuard` (see `01_ARCHITECTURE.md`) — same `nonReentrant` modifier, drop-in.
- **`SafeCast`** on every `uint256 → uint96`/`uint40` conversion (`msg.value.toUint96()`, deadline calc). Without it, an out-of-range value silently truncated instead of reverting.
- **New validations, not explicit in the original spec:**
  - `goal > 0` (`InvalidGoal`) — `goal == 0` would make a project "successful" (`pledged >= goal`) with zero funds raised.
  - `msg.value > 0` in `pledge` (`ZeroPledge`) — avoids event noise with no real contribution.
  - Existence of `id` (`ProjectNotFound`) in `getProject`, `isSuccessful`, `pledge`, `claimFunds`, `refund` — a nonexistent `id` used to return a zeroed struct, and `0 >= 0` made `isSuccessful` return `true` for projects that never existed.
  - **(2026-07-09) `durationSeconds`/`InvalidDuration` removed** along with the whole deadline concept, see `05_CRITICAL_REVIEW.md`. `pledge` now only reverts with `ProjectClosed` if the project was already claimed.
- **Custom errors (`error X()`)** instead of `require(string)` throughout — cheaper gas, relevant to the 350k/120k budget.
- `metadataCID` received as `calldata` (not `memory`) in `createProject`: an external string that's only stored, avoiding an extra memory copy.

Full code/test/status detail: `04_STATUS.md`.
