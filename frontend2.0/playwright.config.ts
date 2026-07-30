import { defineConfig, devices } from "@playwright/test";

// E2E suite (docs/09_ROADMAP_MEJORAS.md § 12): runs the real frontend against
// a local Anvil node with a real deployed Crowdfunding contract. Wallets are
// simulated via an injected EIP-1193 provider (e2e/fixtures.ts) instead of
// automating the real MetaMask extension — see e2e/README.md for why.
//
// Prerequisite (not run automatically by this config): `npm run e2e:setup`
// from the repo root, which starts Anvil + deploys the contract + writes
// .env.e2e.local. Playwright only starts the frontend's dev server.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false, // all specs share the same Anvil chain state — no parallel runs
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // --mode e2e makes Vite load .env.e2e.local (written by e2e:setup) on
    // top of .env. VITE_E2E is also passed directly as a belt-and-suspenders
    // fallback in case --mode env loading behaves differently across platforms.
    command: "npm run dev -- --mode e2e",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_E2E: "true" },
  },
});
