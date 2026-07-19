import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { parseEther, getAddress } from "viem";

// Phase 2 (03_PLAN_FASES.md): "Reentrancy test (attacker mock)".
// Covers the contract's two only funds exit paths: refund and claimFunds.
// See contracts/mocks/ReentrancyAttacker.sol for the attack mechanism.

const SAMPLE_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

const { viem, networkHelpers } = await hre.network.create();

describe("Crowdfunding — reentrancy (Phase 2)", function () {
  async function deployFixture() {
    const crowdfunding = await viem.deployContract("Crowdfunding");
    const attacker = await viem.deployContract("ReentrancyAttacker", [crowdfunding.address]);
    const [deployer, otherBacker] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();
    return { crowdfunding, attacker, deployer, otherBacker, publicClient };
  }

  it("blocks reentrancy in refund() and only pays once", async function () {
    const { crowdfunding, attacker, otherBacker, publicClient } = await networkHelpers.loadFixture(deployFixture);

    const goal = parseEther("1");
    // The project is created by a normal account (not the attacker); this
    // doesn't affect the attack on refund, which only depends on who made the
    // pledge. In the current model (no deadline) refund doesn't require the
    // project to have "failed".
    await crowdfunding.write.createProject([goal, SAMPLE_CID]);

    await attacker.write.attackPledge([0n], { value: parseEther("0.3") });
    // A legitimate backer also pledges, to simulate a realistic case with more than one backer.
    await crowdfunding.write.pledge([0n], { account: otherBacker.account, value: parseEther("0.1") });

    const contractBalanceBefore = await publicClient.getBalance({ address: crowdfunding.address });

    // The attacker's refund triggers its receive(), which tries to re-enter refund().
    await attacker.write.attackRefund([0n]);

    const contractBalanceAfter = await publicClient.getBalance({ address: crowdfunding.address });

    // 1) The reentrant call attempted inside receive() must have reverted (nonReentrant guard).
    assert.equal(await attacker.read.reentrantCallReverted(), true, "the reentrant call to refund() should have reverted");
    // 2) receive() only ran once: there was no second real payment.
    assert.equal(await attacker.read.receiveCount(), 1n);
    // 3) The contract only paid the attacker's real amount (0.3 ETH), not double.
    assert.equal(contractBalanceBefore - contractBalanceAfter, parseEther("0.3"));
    // 4) The attacker's pledge is now 0 (didn't stay "alive" for a second real refund).
    assert.equal(await crowdfunding.read.pledgeOf([0n, getAddress(attacker.address)]), 0n);
    // 5) The other backer's pledge remains intact (the attack didn't affect other funds).
    assert.equal(
      await crowdfunding.read.pledgeOf([0n, otherBacker.account.address]),
      parseEther("0.1"),
    );
  });

  it("blocks reentrancy in claimFunds() and only pays once", async function () {
    const { crowdfunding, attacker, otherBacker, publicClient } = await networkHelpers.loadFixture(deployFixture);

    const goal = parseEther("1");
    // The attacker creates the project: this way it ends up as `creator`, required to call claimFunds.
    await attacker.write.createMaliciousProject([goal, SAMPLE_CID]);

    // A legitimate backer pledges the full goal amount.
    await crowdfunding.write.pledge([0n], { account: otherBacker.account, value: goal });

    const contractBalanceBefore = await publicClient.getBalance({ address: crowdfunding.address });

    await attacker.write.attackClaim([0n]);

    const contractBalanceAfter = await publicClient.getBalance({ address: crowdfunding.address });

    assert.equal(
      await attacker.read.reentrantCallReverted(),
      true,
      "the reentrant call to claimFunds() should have reverted",
    );
    assert.equal(await attacker.read.receiveCount(), 1n);
    // The contract only paid out the total raised once (not double).
    assert.equal(contractBalanceBefore - contractBalanceAfter, goal);

    const project = await crowdfunding.read.getProject([0n]);
    assert.equal(project.claimed, true);
  });
});
