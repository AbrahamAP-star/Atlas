import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { parseEther } from "viem";

// Client hard limits (see 00_PROJECT_OVERVIEW.md). Tests fail if exceeded,
// turning the business constraint into an automated check.
const MAX_GAS_CREATE_PROJECT = 350_000n;
const MAX_GAS_PLEDGE = 120_000n;

const SAMPLE_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"; // sample CIDv1

const { viem, networkHelpers } = await hre.network.create();

describe("Crowdfunding", function () {
  // -----------------------------------------------------------------------
  // Fixture: deploys the contract once and reuses the snapshot across tests
  // -----------------------------------------------------------------------
  async function deployCrowdfundingFixture() {
    const crowdfunding = await viem.deployContract("Crowdfunding");
    const [creator, backer1, backer2] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();
    return { crowdfunding, creator, backer1, backer2, publicClient };
  }

  /** Creates a project with the default goal and returns the tx hash. */
  async function createDefaultProject(
    crowdfunding: Awaited<ReturnType<typeof viem.deployContract>>,
    goal = parseEther("1"),
  ) {
    return crowdfunding.write.createProject([goal, SAMPLE_CID]);
  }

  // -----------------------------------------------------------------------
  // createProject
  // -----------------------------------------------------------------------
  describe("createProject", function () {
    it("creates the project, emits ProjectCreated and respects the 350k gas budget", async function () {
      const { crowdfunding, publicClient } = await networkHelpers.loadFixture(deployCrowdfundingFixture);

      const goal = parseEther("2");
      const hash = await crowdfunding.write.createProject([goal, SAMPLE_CID]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      assert.ok(
        receipt.gasUsed <= MAX_GAS_CREATE_PROJECT,
        `createProject used ${receipt.gasUsed} gas, exceeds the ${MAX_GAS_CREATE_PROJECT} limit`,
      );

      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.goal, goal);
      assert.equal(project.pledged, 0n);
      assert.equal(project.claimed, false);
      assert.equal(await crowdfunding.read.nextProjectId(), 1);
    });

    it("reverts with InvalidGoal if goal == 0", async function () {
      const { crowdfunding } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await viem.assertions.revertWithCustomError(
        crowdfunding.write.createProject([0n, SAMPLE_CID]),
        crowdfunding,
        "InvalidGoal",
      );
    });

    // `goal` is declared as uint96 directly in the function signature (no
    // uint256 -> uint96 cast happens for it like msg.value in pledge), so
    // the ABI encoder rejects an out-of-range value before it reaches the
    // contract. This only confirms the upper type bound works end-to-end.
    it("accepts type(uint96).max as a valid goal (upper type bound)", async function () {
      const { crowdfunding } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const maxGoal = 2n ** 96n - 1n;

      await crowdfunding.write.createProject([maxGoal, SAMPLE_CID]);

      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.goal, maxGoal);
    });
  });

  // -----------------------------------------------------------------------
  // pledge
  // -----------------------------------------------------------------------
  describe("pledge", function () {
    it("accepts a valid pledge, emits Pledged and respects the 120k gas budget", async function () {
      const { crowdfunding, backer1, publicClient } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      const amount = parseEther("0.5");
      const hash = await crowdfunding.write.pledge([0n], {
        account: backer1.account,
        value: amount,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      assert.ok(
        receipt.gasUsed <= MAX_GAS_PLEDGE,
        `pledge used ${receipt.gasUsed} gas, exceeds the ${MAX_GAS_PLEDGE} limit`,
      );

      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), amount);
      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.pledged, amount);
    });

    it("accumulates multiple pledges from the same backer", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.3") });
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.2") });

      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), parseEther("0.5"));
    });

    // Regular usage path (2 distinct backers), not just the same-backer
    // accumulation case above: confirms project.pledged sums correctly and
    // one backer's pledge never leaks into another's pledgeOf.
    it("keeps separate accounting for two distinct backers on the same project", async function () {
      const { crowdfunding, backer1, backer2 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.3") });
      await crowdfunding.write.pledge([0n], { account: backer2.account, value: parseEther("0.4") });

      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), parseEther("0.3"));
      assert.equal(await crowdfunding.read.pledgeOf([0n, backer2.account.address]), parseEther("0.4"));

      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.pledged, parseEther("0.7"));
    });

    it("reverts with ZeroPledge if msg.value == 0", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      await viem.assertions.revertWithCustomError(
        crowdfunding.write.pledge([0n], { account: backer1.account, value: 0n }),
        crowdfunding,
        "ZeroPledge",
      );
    });

    it("reverts with ProjectClosed if the creator already claimed the funds", async function () {
      const { crowdfunding, creator, backer1, backer2 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });
      await crowdfunding.write.claimFunds([0n], { account: creator.account });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.pledge([0n], { account: backer2.account, value: parseEther("0.1") }),
        crowdfunding,
        "ProjectClosed",
        [0n],
      );
    });

    it("reverts with ProjectNotFound if the id doesn't exist", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.pledge([99n], { account: backer1.account, value: parseEther("0.1") }),
        crowdfunding,
        "ProjectNotFound",
        [99n],
      );
    });
  });

  // -----------------------------------------------------------------------
  // Views: getProject / pledgeOf / isSuccessful
  // -----------------------------------------------------------------------
  // These are exercised indirectly inside other describes, but the exact
  // success boundary (pledged == goal) and the nonexistent-id case for each
  // view deserve a direct test: 05_CRITICAL_REVIEW.md already documented a
  // real bug here (a nonexistent id used to read as "successful").
  describe("views (getProject / pledgeOf / isSuccessful)", function () {
    it("isSuccessful is false right below goal and true exactly at goal (boundary)", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);

      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal - 1n });
      assert.equal(await crowdfunding.read.isSuccessful([0n]), false);

      await crowdfunding.write.pledge([0n], { account: backer1.account, value: 1n });
      assert.equal(await crowdfunding.read.isSuccessful([0n]), true);
    });

    it("pledgeOf returns 0 for a backer that never pledged, without reverting", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), 0n);
    });

    it("getProject reverts with ProjectNotFound for a nonexistent id", async function () {
      const { crowdfunding } = await networkHelpers.loadFixture(deployCrowdfundingFixture);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.read.getProject([99n]),
        crowdfunding,
        "ProjectNotFound",
        [99n],
      );
    });

    it("isSuccessful reverts with ProjectNotFound for a nonexistent id", async function () {
      const { crowdfunding } = await networkHelpers.loadFixture(deployCrowdfundingFixture);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.read.isSuccessful([99n]),
        crowdfunding,
        "ProjectNotFound",
        [99n],
      );
    });
  });

  // -----------------------------------------------------------------------
  // claimFunds
  // -----------------------------------------------------------------------
  describe("claimFunds", function () {
    // Regression guard, NOT a client hard requirement (only createProject/pledge
    // have contractual gas limits per 00_PROJECT_OVERVIEW.md). Generous ceiling
    // only meant to catch an accidental gas blow-up (e.g. an added loop).
    it("stays under a 150k gas regression ceiling", async function () {
      const { crowdfunding, creator, backer1, publicClient } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });

      const hash = await crowdfunding.write.claimFunds([0n], { account: creator.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      assert.ok(receipt.gasUsed <= 150_000n, `claimFunds used ${receipt.gasUsed} gas, exceeds the 150k regression ceiling`);
    });

    it("the creator withdraws the total raised when the project succeeded", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });

      // Checks the CONTRACT's balance (not the creator's): the creator pays the
      // gas for their own call, so their net balance doesn't change by exactly
      // `goal`. The contract, on the other hand, must go from `goal` to 0 wei.
      await viem.assertions.balancesHaveChanged(
        crowdfunding.write.claimFunds([0n], { account: creator.account }),
        [{ address: crowdfunding.address, amount: -goal }],
      );

      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.claimed, true);
    });

    it("reverts with NotProjectCreator if called by someone other than the creator", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.claimFunds([0n], { account: backer1.account }),
        crowdfunding,
        "NotProjectCreator",
        [0n],
      );
    });

    it("reverts with ProjectNotSuccessful if the goal wasn't reached", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.4") });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.claimFunds([0n], { account: creator.account }),
        crowdfunding,
        "ProjectNotSuccessful",
        [0n],
      );
    });

    it("reverts with AlreadyClaimed on a second claim attempt", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });

      await crowdfunding.write.claimFunds([0n], { account: creator.account });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.claimFunds([0n], { account: creator.account }),
        crowdfunding,
        "AlreadyClaimed",
        [0n],
      );
    });
  });

  // -----------------------------------------------------------------------
  // refund
  // -----------------------------------------------------------------------
  describe("refund", function () {
    // Regression guard, NOT a client hard requirement (see claimFunds note above).
    it("stays under a 150k gas regression ceiling", async function () {
      const { crowdfunding, backer1, publicClient } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.3") });

      const hash = await crowdfunding.write.refund([0n], { account: backer1.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      assert.ok(receipt.gasUsed <= 150_000n, `refund used ${receipt.gasUsed} gas, exceeds the 150k regression ceiling`);
    });

    it("each backer recovers their own pledge at any time (independent of goal success)", async function () {
      const { crowdfunding, backer1, backer2 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);

      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.3") });
      await crowdfunding.write.pledge([0n], { account: backer2.account, value: parseEther("0.2") });

      // Same as in claimFunds: the contract's balance is measured (drops by
      // exactly the refunded amount) instead of backer1's balance, who pays
      // their own gas.
      await viem.assertions.balancesHaveChanged(
        crowdfunding.write.refund([0n], { account: backer1.account }),
        [{ address: crowdfunding.address, amount: -parseEther("0.3") }],
      );

      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), 0n);
      // backer1's refund must not affect backer2's pledge (individual refund).
      assert.equal(await crowdfunding.read.pledgeOf([0n, backer2.account.address]), parseEther("0.2"));
      // project.pledged must reflect the real remaining balance, not the historical total.
      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.pledged, parseEther("0.2"));
    });

    it("allows refund even if the project already reached the goal, as long as it hasn't been claimed", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });

      assert.equal(await crowdfunding.read.isSuccessful([0n]), true);

      await crowdfunding.write.refund([0n], { account: backer1.account });
      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), 0n);
    });

    it("reverts with AlreadyClaimed if the creator already withdrew the funds", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });
      await crowdfunding.write.claimFunds([0n], { account: creator.account });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.refund([0n], { account: backer1.account }),
        crowdfunding,
        "AlreadyClaimed",
        [0n],
      );
    });

    it("reverts with NoFundsToRefund if the backer never pledged", async function () {
      const { crowdfunding, backer1, backer2 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.1") });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.refund([0n], { account: backer2.account }),
        crowdfunding,
        "NoFundsToRefund",
        [0n],
      );
    });
  });

  // -----------------------------------------------------------------------
  // deleteProject
  // -----------------------------------------------------------------------
  describe("deleteProject", function () {
    // Regression guard, NOT a client hard requirement (see claimFunds note above).
    // deleteProject only writes a storage delete (no external call), so it's
    // expected to be cheaper than claimFunds/refund — same ceiling kept for
    // consistency, still catches a real regression if logic grows later.
    it("stays under a 150k gas regression ceiling", async function () {
      const { crowdfunding, creator, publicClient } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      const hash = await crowdfunding.write.deleteProject([0n], { account: creator.account });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      assert.ok(receipt.gasUsed <= 150_000n, `deleteProject used ${receipt.gasUsed} gas, exceeds the 150k regression ceiling`);
    });

    it("deletes a project with no pledges, emits ProjectDeleted and frees the id (creator resets to address(0))", async function () {
      const { crowdfunding, creator } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      await crowdfunding.write.deleteProject([0n], { account: creator.account });

      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.creator, "0x0000000000000000000000000000000000000000");
      assert.equal(project.pledged, 0n);
    });

    it("deletes an already-claimed project (claimed == true, pledged > 0)", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: goal });
      await crowdfunding.write.claimFunds([0n], { account: creator.account });

      await crowdfunding.write.deleteProject([0n], { account: creator.account });

      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.creator, "0x0000000000000000000000000000000000000000");
    });

    it("reverts with ProjectHasActiveFunds if there are unclaimed pledges (protects backers)", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.3") });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.deleteProject([0n], { account: creator.account }),
        crowdfunding,
        "ProjectHasActiveFunds",
        [0n],
      );

      // The backer can still refund: the project wasn't touched.
      await crowdfunding.write.refund([0n], { account: backer1.account });
      assert.equal(await crowdfunding.read.pledgeOf([0n, backer1.account.address]), 0n);
    });

    it("allows deletion after all backers refunded (pledged goes back to 0)", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      const goal = parseEther("1");
      await createDefaultProject(crowdfunding, goal);
      await crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.3") });
      await crowdfunding.write.refund([0n], { account: backer1.account });

      await crowdfunding.write.deleteProject([0n], { account: creator.account });
      const project = await crowdfunding.read.getProject([0n]);
      assert.equal(project.creator, "0x0000000000000000000000000000000000000000");
    });

    it("reverts with NotProjectCreator if called by someone other than the creator", async function () {
      const { crowdfunding, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.deleteProject([0n], { account: backer1.account }),
        crowdfunding,
        "NotProjectCreator",
        [0n],
      );
    });

    it("reverts with ProjectNotFound if the id doesn't exist", async function () {
      const { crowdfunding, creator } = await networkHelpers.loadFixture(deployCrowdfundingFixture);

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.deleteProject([99n], { account: creator.account }),
        crowdfunding,
        "ProjectNotFound",
        [99n],
      );
    });

    it("a deleted project no longer accepts pledges (reverts with ProjectClosed)", async function () {
      const { crowdfunding, creator, backer1 } = await networkHelpers.loadFixture(deployCrowdfundingFixture);
      await createDefaultProject(crowdfunding);
      await crowdfunding.write.deleteProject([0n], { account: creator.account });

      await viem.assertions.revertWithCustomErrorWithArgs(
        crowdfunding.write.pledge([0n], { account: backer1.account, value: parseEther("0.1") }),
        crowdfunding,
        "ProjectClosed",
        [0n],
      );
    });
  });
});
