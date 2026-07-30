import { test, expect, gotoAppReady } from "./fixtures";

/**
 * Happy path (docs/09_ROADMAP_MEJORAS.md § 12, entregable 1): create project
 * → pledge from a second wallet → claim from the first wallet → the "Claim
 * funds" button disappears once claimed. Runs against a real deployed
 * Crowdfunding instance on Anvil (see scripts/e2e-setup.ts) — this is the
 * exact frontend↔contract integration layer where this project's 2 real bugs
 * happened (canClaim/canRefund, toProject destructuring — docs/05_CRITICAL_REVIEW.md).
 */

const GOAL_ETH = "0.01";
// Unique per run so re-running the suite against the same Anvil chain
// (without wiping state) never collides with a project from a previous run.
const PROJECT_TITLE = `E2E happy path ${Date.now()}`;

test("create → pledge → claim", async ({ creatorPage, backerPage }) => {
  // --- Creator: connect + create the project ---
  await gotoAppReady(creatorPage);
  const creatorDemo = creatorPage.locator("#demo");
  await creatorDemo.scrollIntoViewIfNeeded();
  await creatorDemo.getByRole("button", { name: "Connect wallet" }).click();
  await expect(creatorDemo.getByText(/0xf39F.*9226/)).toBeVisible({ timeout: 15_000 });

  // .hero-actions scopes this to the Hero's primary CTA — LandingCTA further
  // down the same #demo section renders a second button with the identical
  // accessible name "Create project", which makes an unscoped locator ambiguous.
  await creatorDemo.locator(".hero-actions").getByRole("button", { name: "Create project" }).click();
  await creatorDemo.getByPlaceholder("Title").fill(PROJECT_TITLE);
  await creatorDemo.getByPlaceholder("Description").fill("Created by the Playwright E2E suite.");
  await creatorDemo.getByPlaceholder("Minimum goal (ETH)").fill(GOAL_ETH);
  await creatorDemo.getByRole("button", { name: "Create project" }).click();

  // Back in the list view once useCreateProject's status hits "success" (see AppShell's onCreated).
  const projectCard = creatorDemo.locator(".project-card", { hasText: PROJECT_TITLE });
  await expect(projectCard).toBeVisible({ timeout: 30_000 });

  // --- Backer: connect + pledge exactly the goal amount ---
  await gotoAppReady(backerPage);
  const backerDemo = backerPage.locator("#demo");
  await backerDemo.scrollIntoViewIfNeeded();
  await backerDemo.getByRole("button", { name: "Connect wallet" }).click();
  await expect(backerDemo.getByText(/0x7099.*79C8/)).toBeVisible({ timeout: 15_000 });

  await backerDemo.getByRole("button", { name: "Explore projects" }).click();
  await backerDemo.locator(".project-card", { hasText: PROJECT_TITLE }).click();

  await backerDemo.getByPlaceholder("Amount in ETH").fill(GOAL_ETH);
  await backerDemo.getByRole("button", { name: "Pledge", exact: true }).click();
  await expect(backerDemo.getByText(`Raised: ${GOAL_ETH} ETH of ${GOAL_ETH} ETH`)).toBeVisible({
    timeout: 30_000,
  });

  // --- Creator: reload to pick up the now-successful project, then claim ---
  await creatorPage.reload();
  await creatorDemo.scrollIntoViewIfNeeded();
  await creatorDemo.getByRole("button", { name: "Explore projects" }).click();
  await creatorDemo.locator(".project-card", { hasText: PROJECT_TITLE }).click();

  const claimButton = creatorDemo.getByRole("button", { name: "Claim funds" });
  await expect(claimButton).toBeVisible();
  await claimButton.click();

  // The exact assertion this roadmap point asks for: the button disappears
  // once the claim is confirmed (canClaimProject() becomes false — claimed === true).
  await expect(claimButton).toHaveCount(0, { timeout: 30_000 });
});
