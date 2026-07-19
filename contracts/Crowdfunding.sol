// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/**
 * @title Crowdfunding
 * @notice Decentralized crowdfunding platform. There is no deadline: a project
 *         stays open to pledges indefinitely. `goal` is no longer a term with a
 *         fixed target but the MINIMUM amount that unlocks withdrawal for the
 *         creator; once reached, the creator decides when to claim (`claimFunds`),
 *         and the project keeps accepting pledges until then. As long as the
 *         creator hasn't claimed, any backer can refund themselves individually
 *         at any time (this is the funds exit path required by the client — see
 *         05_CRITICAL_REVIEW.md — since there is no "deadline failure" that
 *         triggers it automatically). There is no admin function that can block
 *         either of these two exit paths.
 * @dev Pull-payment pattern: ETH is never sent "push"-style with loops over backers.
 *      Each user withdraws what's owed by calling claimFunds/refund themselves.
 *
 *      Uses ReentrancyGuardTransient (transient storage / EIP-1153) instead of the
 *      classic ReentrancyGuard: the lock uses TSTORE/TLOAD instead of SSTORE/SLOAD,
 *      saving ~2500-5000 gas per call. This matters because `pledge` has a hard
 *      budget of 120,000 gas. Requires a network with Cancun/EIP-1153 support
 *      (Base, Arbitrum and Optimism already support it in 2026).
 *      Source: OpenZeppelin Contracts v5.6.1, utils/ReentrancyGuardTransient.sol.
 */
contract Crowdfunding is ReentrancyGuardTransient {
    using SafeCast for uint256;

    // ---------------------------------------------------------------------
    // Types and storage
    // ---------------------------------------------------------------------

    /// @dev Field order chosen for packing: slot0 = creator+goal (exactly 32
    ///      bytes), slot1 = pledged+claimed (13/32 bytes, room to spare). No
    ///      `deadline` (no longer exists). metadataCID is dynamic and uses its
    ///      own slots. Do not reorder without recalculating this.
    struct Project {
        address payable creator; // 20 bytes ┐ slot 0
        uint96 goal;              // 12 bytes ┘ (exactly 32 bytes) — minimum amount to allow withdrawal
        uint96 pledged;           // 12 bytes ┐ slot 1
        bool claimed;              //  1 byte  ┘
        string metadataCID;       // dynamic slot(s) — reference to IPFS
    }

    /// @notice Id that will be assigned to the next created project. Also acts
    ///         as the upper bound to validate that an id exists (id < nextProjectId).
    uint32 public nextProjectId;

    /// @notice Data for each project, indexed by incremental id.
    mapping(uint256 id => Project project) public projects;

    /// @notice How much each wallet pledged to each project (needed for individual refund).
    mapping(uint256 id => mapping(address backer => uint96 amount)) public pledges;

    // ---------------------------------------------------------------------
    // Events (one per relevant action, client requirement)
    // ---------------------------------------------------------------------

    event ProjectCreated(uint256 indexed id, address indexed creator, uint96 goal);
    event Pledged(uint256 indexed id, address indexed backer, uint96 amount);
    event FundsClaimed(uint256 indexed id, uint96 amount);
    event Refunded(uint256 indexed id, address indexed backer, uint96 amount);
    event ProjectDeleted(uint256 indexed id);

    // ---------------------------------------------------------------------
    // Custom errors
    // ---------------------------------------------------------------------
    // Custom errors are used instead of require(string) because they cost less
    // gas (the message string isn't encoded/stored) — relevant for this
    // contract's 350k/120k gas limits.

    error InvalidGoal();
    error ProjectNotFound(uint256 id);
    error ProjectClosed(uint256 id);
    error ZeroPledge();
    error ProjectNotSuccessful(uint256 id);
    error AlreadyClaimed(uint256 id);
    error NotProjectCreator(uint256 id);
    error NoFundsToRefund(uint256 id);
    error TransferFailed();
    /// @dev Reverts if trying to delete a project with unclaimed pledges:
    ///      deleting it would leave those backers with no way to recover their
    ///      contribution (see deleteProject for full detail).
    error ProjectHasActiveFunds(uint256 id);

    // ---------------------------------------------------------------------
    // Views (do not modify state)
    // ---------------------------------------------------------------------

    /// @notice Returns the full data of a project.
    function getProject(uint256 id) external view returns (Project memory) {
        _requireProjectExists(id);
        return projects[id];
    }

    /// @notice How much `backer` pledged to project `id`.
    function pledgeOf(uint256 id, address backer) external view returns (uint96) {
        return pledges[id][backer];
    }

    /// @notice `true` if the project reached (or exceeded) its goal.
    function isSuccessful(uint256 id) external view returns (bool) {
        _requireProjectExists(id);
        return _isSuccessful(id);
    }

    // ---------------------------------------------------------------------
    // Internal validation/read helpers (avoid duplicating logic and checks)
    // ---------------------------------------------------------------------

    function _requireProjectExists(uint256 id) internal view {
        if (id >= nextProjectId) revert ProjectNotFound(id);
    }

    function _isSuccessful(uint256 id) internal view returns (bool) {
        return projects[id].pledged >= projects[id].goal;
    }

    // ---------------------------------------------------------------------
    // State changes (at the end of the file, team readability convention —
    // does not add security by itself, see 05_CRITICAL_REVIEW.md).
    // ---------------------------------------------------------------------

    /**
     * @notice Creates a crowdfunding project with no deadline.
     * @param goal Minimum amount, in wei, that allows the creator to withdraw. Must be greater than 0.
     * @param metadataCID IPFS CID with the metadata (description, image).
     * @return id Incremental id assigned to the project.
     *
     * @dev `metadataCID` uses `calldata` instead of `memory`: since it's a string
     *      that arrives from outside and is only stored (never modified inside
     *      the function), calldata avoids the extra copy to memory and cheapens
     *      this function's gas cost. goal==0 is explicitly rejected: a project
     *      with goal=0 would be "successful" (pledged >= goal) without having
     *      received a single wei, which breaks claimFunds semantics. There is no
     *      more `durationSeconds`/`deadline`: the project stays open to pledges
     *      indefinitely until the creator claims.
     */
    function createProject(
        uint96 goal,
        string calldata metadataCID
    ) external returns (uint256 id) {
        if (goal == 0) revert InvalidGoal();

        id = nextProjectId;
        nextProjectId++; // checked by default in Solidity 0.8+, reverts on uint32 overflow

        projects[id] = Project({
            creator: payable(msg.sender),
            goal: goal,
            pledged: 0,
            claimed: false,
            metadataCID: metadataCID
        });

        emit ProjectCreated(id, msg.sender, goal);
    }

    /**
     * @notice Pledges native ETH to an existing project.
     * @dev Checks-Effects-Interactions: there is no external call in this
     *      function (it doesn't send ETH), but `nonReentrant` is kept as
     *      defense in depth and for consistency with the other state-changing
     *      functions. msg.value == 0 is rejected: a pledge of 0 contributes
     *      nothing, it would only create event/log noise for no reason (see
     *      recommendation in 05_CRITICAL_REVIEW.md).
     */
    function pledge(uint256 id) external payable nonReentrant {
        _requireProjectExists(id);
        if (msg.value == 0) revert ZeroPledge();
        // A project stops accepting pledges once the creator has already
        // claimed the funds (`claimed`) or once the creator deleted it
        // (`deleteProject` leaves `creator == address(0)`, since
        // `id < nextProjectId` still holds and so `_requireProjectExists`
        // alone can't detect it).
        if (projects[id].claimed || projects[id].creator == address(0)) revert ProjectClosed(id);

        uint96 amount = msg.value.toUint96(); // reverts if msg.value > type(uint96).max, never truncates silently

        pledges[id][msg.sender] += amount; // checked addition: reverts on uint96 overflow
        projects[id].pledged += amount;

        emit Pledged(id, msg.sender, amount);
    }

    /**
     * @notice The creator withdraws the total raised if the project succeeded.
     * @dev Effects (claimed = true) before the interaction (call), following CEI.
     */
    function claimFunds(uint256 id) external nonReentrant {
        _requireProjectExists(id);
        Project storage project = projects[id];

        if (msg.sender != project.creator) revert NotProjectCreator(id);
        if (!_isSuccessful(id)) revert ProjectNotSuccessful(id);
        if (project.claimed) revert AlreadyClaimed(id);

        uint96 amount = project.pledged;

        project.claimed = true; // effect before the interaction

        (bool success, ) = project.creator.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FundsClaimed(id, amount);
    }

    /**
     * @notice Any backer recovers their own pledge, at any time, as long as
     *         the creator hasn't claimed the funds.
     * @dev Without a deadline there is no "campaign failure" that triggers the
     *      refund automatically, so this is now the ONLY exit path for a
     *      backer who changes their mind before the creator withdraws (hard
     *      client requirement: no funds may end up locked with no exit, see
     *      05_CRITICAL_REVIEW.md). It's only blocked once `claimed == true`,
     *      because at that point the backer's ETH has already left the
     *      contract to the creator and there's nothing left to refund.
     *      Also decreases `project.pledged` (not just `pledges[id][msg.sender]`):
     *      unlike the previous model (where refund only happened after an
     *      irreversible failure and `pledged` was never read again), here a
     *      project can keep receiving pledges after a refund, so `pledged`
     *      must always reflect the real available balance — otherwise
     *      `isSuccessful`/`claimFunds` would read an inflated total that is
     *      no longer in the contract.
     *      Individual refund (no loop over all backers): prevents a backer
     *      from blocking everyone else's refund and avoids gas DoS if the
     *      backer list grows (see 02_SMART_CONTRACT_SPEC.md).
     */
    function refund(uint256 id) external nonReentrant {
        _requireProjectExists(id);
        Project storage project = projects[id];
        if (project.claimed) revert AlreadyClaimed(id);

        uint96 amount = pledges[id][msg.sender];
        if (amount == 0) revert NoFundsToRefund(id);

        pledges[id][msg.sender] = 0; // effect before the interaction
        project.pledged -= amount;   // keeps `pledged` equal to the real remaining balance

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Refunded(id, msg.sender, amount);
    }

    /**
     * @notice The creator deletes their own published project, whether or not
     *         the funds were already claimed.
     * @dev Only allowed if there are no backer funds left at risk:
     *      `pledged == 0` (never received pledges, or all were refunded) or
     *      `claimed == true` (the creator already withdrew the total, nothing
     *      left pending refund). If there were unclaimed pledges
     *      (`pledged > 0 && !claimed`), deleting would leave those backers with
     *      no way to recover their contribution (refund would read
     *      `pledged == 0` after deletion and revert on underflow), violating
     *      the hard rule of "no funds locked with no exit"
     *      (02_SMART_CONTRACT_SPEC.md) — that's why that case is explicitly
     *      rejected instead of always allowing deletion.
     *      `delete` frees the storage slot (gas refund) and triggers Solidity's
     *      default: `creator` goes back to `address(0)`, which `pledge` already
     *      treats as "project closed" (see comment in `pledge`).
     */
    function deleteProject(uint256 id) external {
        _requireProjectExists(id);
        Project storage project = projects[id];

        if (msg.sender != project.creator) revert NotProjectCreator(id);
        if (project.pledged != 0 && !project.claimed) revert ProjectHasActiveFunds(id);

        delete projects[id];

        emit ProjectDeleted(id);
    }
}
