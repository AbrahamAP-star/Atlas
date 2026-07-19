import { describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { parseEther } from "viem";

// Phase 2 (03_PLAN_FASES.md): "basic amount fuzzing test... missing pledge fuzz
// test with msg.value". fast-check isn't installed (no network access to add
// new dependencies), so fuzzing is done with node:test + a pseudo-random
// generator with a fixed SEED (reproducible) plus the exact uint96 edge cases,
// which are the ones that actually matter for SafeCast.

const SAMPLE_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
const MAX_UINT96 = (1n << 96n) - 1n; // 79,228,162,514,264,337,593,543,950,335 wei

const { viem, networkHelpers } = await hre.network.create();

// Deterministic PRNG (mulberry32) so the fuzz is reproducible across runs
// and machines — a fuzz test that fails differently every time is impossible
// to debug.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260706); // fixed seed = Phase 1 close date, only for traceability

async function deployFixture() {
  const crowdfunding = await viem.deployContract("Crowdfunding");
  const [creator, backer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  return { crowdfunding, creator, backer, publicClient };
}

describe("Crowdfunding — pledge fuzz (Phase 2)", function () {
  it("accepts N random amounts within a realistic range without breaking accounting", async function () {
    const { crowdfunding, backer } = await networkHelpers.loadFixture(deployFixture);

    // Deliberately high goal so no random amount triggers success; the current
    // model has no deadline, so this is no longer strictly necessary, but it
    // keeps the test focused only on pledge accounting.
    await crowdfunding.write.createProject([parseEther("1000000"), SAMPLE_CID]);

    const RUNS = 25;
    let expectedTotal = 0n;

    for (let i = 0; i < RUNS; i++) {
      // Amounts between 1 wei and 5 ETH, uniform distribution over that range.
      const amount = 1n + BigInt(Math.floor(rng() * Number(parseEther("5"))));

      await crowdfunding.write.pledge([0n], { account: backer.account, value: amount });
      expectedTotal += amount;

      assert.equal(
        await crowdfunding.read.pledgeOf([0n, backer.account.address]),
        expectedTotal,
        `accounting mismatch at iteration ${i} with amount=${amount}`,
      );
    }

    const project = await crowdfunding.read.getProject([0n]);
    assert.equal(project.pledged, expectedTotal);
  });

  it("accepts exactly type(uint96).max as a single pledge (valid upper bound)", async function () {
    const { crowdfunding, backer } = await networkHelpers.loadFixture(deployFixture);
    await crowdfunding.write.createProject([MAX_UINT96, SAMPLE_CID]);

    // A real test account's balance doesn't reach MAX_UINT96 wei; it's forced
    // via setBalance to exercise the exact edge that SafeCast must accept.
    await networkHelpers.setBalance(backer.account.address, MAX_UINT96 + parseEther("1"));

    await crowdfunding.write.pledge([0n], { account: backer.account, value: MAX_UINT96 });

    assert.equal(await crowdfunding.read.pledgeOf([0n, backer.account.address]), MAX_UINT96);
    const project = await crowdfunding.read.getProject([0n]);
    assert.equal(project.pledged, MAX_UINT96);
    // Once the goal is reached exactly, the project should already read as successful.
    assert.equal(await crowdfunding.read.isSuccessful([0n]), true);
  });

  it("reverts (doesn't truncate silently) if msg.value > type(uint96).max", async function () {
    const { crowdfunding, backer } = await networkHelpers.loadFixture(deployFixture);
    await crowdfunding.write.createProject([MAX_UINT96, SAMPLE_CID]);

    const overflowAmount = MAX_UINT96 + 1n;
    await networkHelpers.setBalance(backer.account.address, overflowAmount + parseEther("1"));

    // SafeCast.toUint96 must revert with SafeCastOverflowedUintDowncast, not truncate the value.
    await assert.rejects(
      crowdfunding.write.pledge([0n], { account: backer.account, value: overflowAmount }),
      /SafeCastOverflowedUintDowncast|revert/i,
    );

    // On revert, no partial/truncated record should remain.
    assert.equal(await crowdfunding.read.pledgeOf([0n, backer.account.address]), 0n);
  });

  it("reverts on sum overflow if accumulating two pledges exceeds type(uint96).max", async function () {
    const { crowdfunding, backer } = await networkHelpers.loadFixture(deployFixture);
    // A goal above MAX_UINT96 isn't representable (goal is also uint96), so
    // MAX_UINT96 is used as the goal: the project would already be "successful"
    // after the first pledge, but that doesn't block further pledges (no cap
    // after success).
    await crowdfunding.write.createProject([MAX_UINT96, SAMPLE_CID]);

    await networkHelpers.setBalance(backer.account.address, MAX_UINT96 + parseEther("10"));

    // First pledge: at the exact edge.
    await crowdfunding.write.pledge([0n], { account: backer.account, value: MAX_UINT96 });

    // Second pledge: even 1 wei more already overflows the accumulated sum in
    // uint96, which under Solidity 0.8 is checked arithmetic and must revert
    // (panic 0x11, overflow).
    await assert.rejects(
      crowdfunding.write.pledge([0n], { account: backer.account, value: 1n }),
      /overflow|revert|panic/i,
    );

    // The accumulated total must not have changed due to the failed attempt.
    assert.equal(await crowdfunding.read.pledgeOf([0n, backer.account.address]), MAX_UINT96);
  });

  it("reverts with ZeroPledge for the minimum invalid value (0 wei), regardless of the rest of the range", async function () {
    const { crowdfunding, backer } = await networkHelpers.loadFixture(deployFixture);
    await crowdfunding.write.createProject([parseEther("1"), SAMPLE_CID]);

    await viem.assertions.revertWithCustomError(
      crowdfunding.write.pledge([0n], { account: backer.account, value: 0n }),
      crowdfunding,
      "ZeroPledge",
    );
  });
});
