import { test, expect, ANVIL_ACCOUNTS, gotoAppReady } from "./fixtures";

/**
 * Refund path (docs/09_ROADMAP_MEJORAS.md § 12, entregable 2): a project
 * that never reaches its goal lets a backer pull their pledge back at any
 * time (no deadline model, see docs/02_SMART_CONTRACT_SPEC.md) — confirms
 * both the UI signal ("Request refund" disappearing) and the actual on-chain
 * effect (the backer's wallet balance goes up).
 */

// High goal, on purpose: the small pledge below must never reach it, so
// canRefundProject() stays true (refund never depends on isSuccessful).
const GOAL_ETH = "100";
const PLEDGE_ETH = "1"; // comfortably larger than any Anvil gas cost, so a balance increase is unambiguous
const PROJECT_TITLE = `E2E refund ${Date.now()}`;

async function getBalanceWei(request: import("@playwright/test").APIRequestContext, address: string): Promise<bigint> {
  const res = await request.post("http://127.0.0.1:8545", {
    data: { jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] },
  });
  const { result } = await res.json();
  return BigInt(result as string);
}

test("pledge → refund, balance goes back up", async ({ creatorPage, backerPage, request }) => {
  // --- Creator: create a project with a goal the test will never reach ---
  await gotoAppReady(creatorPage);
  const creatorDemo = creatorPage.locator("#demo");
  await creatorDemo.scrollIntoViewIfNeeded();
  await creatorDemo.getByRole("button", { name: "Connect wallet" }).click();
  await expect(creatorDemo.getByText(/0xf39F.*9226/)).toBeVisible({ timeout: 15_000 });

  // .hero-actions scopes this to the Hero's primary CTA — LandingCTA further
  // down the same #demo section renders a second button with the identical
  // accessible name "Create project".
  await creatorDemo.locator(".hero-actions").getByRole("button", { name: "Create project" }).click();
  await creatorDemo.getByPlaceholder("Title").fill(PROJECT_TITLE);
  await creatorDemo.getByPlaceholder("Description").fill("Never reaches its goal, on purpose.");
  await creatorDemo.getByPlaceholder("Minimum goal (ETH)").fill(GOAL_ETH);
  await creatorDemo.getByRole("button", { name: "Create project" }).click();
  await expect(creatorDemo.locator(".project-card", { hasText: PROJECT_TITLE })).toBeVisible({
    timeout: 30_000,
  });

  // --- Backer: connect, pledge, then refund ---
  await gotoAppReady(backerPage);
  const backerDemo = backerPage.locator("#demo");
  await backerDemo.scrollIntoViewIfNeeded();
  await backerDemo.getByRole("button", { name: "Connect wallet" }).click();
  await expect(backerDemo.getByText(/0x7099.*79C8/)).toBeVisible({ timeout: 15_000 });

  await backerDemo.getByRole("button", { name: "Explore projects" }).click();
  await backerDemo.locator(".project-card", { hasText: PROJECT_TITLE }).click();

  const balanceBeforePledge = await getBalanceWei(request, ANVIL_ACCOUNTS.backer);

  await backerDemo.getByPlaceholder("Amount in ETH").fill(PLEDGE_ETH);
  await backerDemo.getByRole("button", { name: "Pledge", exact: true }).click();
  const refundButton = backerDemo.getByRole("button", { name: /Request refund/ });
  await expect(refundButton).toBeVisible({ timeout: 30_000 });

  const balanceAfterPledge = await getBalanceWei(request, ANVIL_ACCOUNTS.backer);
  expect(balanceAfterPledge).toBeLessThan(balanceBeforePledge); // pledge + gas spent

  await refundButton.click();
  // canRefundProject() only needs myPledge > 0n and !claimed — never
  // isSuccessful (docs/02_SMART_CONTRACT_SPEC.md): this button must vanish
  // once the refund confirms, regardless of the project's goal ever being met.
  await expect(refundButton).toHaveCount(0, { timeout: 30_000 });

  const balanceAfterRefund = await getBalanceWei(request, ANVIL_ACCOUNTS.backer);
  expect(balanceAfterRefund).toBeGreaterThan(balanceAfterPledge); // refund landed, net of its own gas cost
});
