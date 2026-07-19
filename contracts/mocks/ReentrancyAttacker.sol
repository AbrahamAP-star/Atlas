// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Crowdfunding} from "../Crowdfunding.sol";

/**
 * @title ReentrancyAttacker
 * @notice Attacker mock used ONLY in tests (Phase 2, see 03_PLAN_FASES.md).
 *         Verifies that `refund` and `claimFunds` resist a classic reentrancy
 *         attack: draining funds by re-calling the withdrawal function inside
 *         `receive()`, before the original Crowdfunding external call has returned.
 * @dev The reentrant call is expected to revert with OZ's custom error
 *      `ReentrancyGuardReentrantCall` (transient guard, see 01_ARCHITECTURE.md).
 *      As a second layer (defense in depth already documented in the real
 *      contract), even if the guard didn't exist, the CEI pattern already
 *      leaves the balance at 0 before the interaction, so a second pass
 *      couldn't withdraw twice either.
 *      This contract is NOT deployed to production, it only lives under
 *      contracts/mocks so Hardhat compiles it alongside the rest and it's
 *      available in the tests.
 */
contract ReentrancyAttacker {
    Crowdfunding public immutable target;

    /// @dev Which function to retry from receive(): 0 = none, 1 = refund, 2 = claimFunds.
    uint8 public attackMode;
    uint256 public projectId;

    /// @dev How many times receive() ran (to confirm only 1 real payment happened).
    uint256 public receiveCount;
    /// @dev true if the reentrant call attempted inside receive() reverted (expected result).
    bool public reentrantCallReverted;

    constructor(Crowdfunding _target) {
        target = _target;
    }

    /// @notice Creates a project where this same contract ends up as `creator` (needed to attack claimFunds).
    function createMaliciousProject(
        uint96 goal,
        string calldata metadataCID
    ) external returns (uint256 id) {
        id = target.createProject(goal, metadataCID);
    }

    /// @notice Pledges to a project on behalf of this contract (msg.sender will be the attacker).
    function attackPledge(uint256 id) external payable {
        target.pledge{value: msg.value}(id);
    }

    /// @notice Triggers the refund withdrawal and arms the attack mode for receive().
    function attackRefund(uint256 id) external {
        attackMode = 1;
        projectId = id;
        target.refund(id);
    }

    /// @notice Triggers the claimFunds withdrawal and arms the attack mode for receive().
    function attackClaim(uint256 id) external {
        attackMode = 2;
        projectId = id;
        target.claimFunds(id);
    }

    /// @dev Runs when Crowdfunding sends ETH via `.call{value: amount}("")`.
    ///      Tries to re-enter BEFORE the original external call returns.
    receive() external payable {
        receiveCount++;
        if (attackMode == 1) {
            attackMode = 0; // cleared before retrying, avoids an infinite loop if it didn't revert
            try target.refund(projectId) {
                reentrantCallReverted = false;
            } catch {
                reentrantCallReverted = true;
            }
        } else if (attackMode == 2) {
            attackMode = 0;
            try target.claimFunds(projectId) {
                reentrantCallReverted = false;
            } catch {
                reentrantCallReverted = true;
            }
        }
    }
}
