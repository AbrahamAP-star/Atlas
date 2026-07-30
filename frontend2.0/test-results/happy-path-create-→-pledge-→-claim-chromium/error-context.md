# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: happy-path.spec.ts >> create → pledge → claim
- Location: e2e/happy-path.spec.ts:17:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#demo').getByText(/0xf39F.*9226/)
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('#demo').getByText(/0xf39F.*9226/)

```

```yaml
- main:
  - text: Case study · Crowdfunding DApp
  - heading "An on-chain crowdfunding dApp where funds never get stuck or depend on a middleman." [level=1]
  - paragraph: Raise capital without banks or slow centralized platforms, with automatic protection against bad faith — deployed, verified, and statically audited.
  - link "Let's talk about your project":
    - /url: "#contacto"
  - link "See live demo":
    - /url: "#demo"
  - paragraph: The problem
  - heading "Raise capital without banks or centralized platforms — and without betting on the other side's good faith." [level=2]
  - paragraph: "Businesses and creators need to fund projects without relying on slow intermediaries or handing over custody of the funds. The guarantee has to live in the code: the money must never disappear, never get stuck, and an exit must always be available for both parties."
  - paragraph: How it works
  - heading "A simple flow, with no surprises for either party." [level=2]
  - list:
    - listitem:
      - text: "01"
      - heading "Publish campaign" [level=3]
      - paragraph: The creator defines title, description, image, and minimum goal. The metadata is uploaded to IPFS; the contract only stores the CID.
    - listitem:
      - text: "02"
      - heading "Pledge with no middlemen" [level=3]
      - paragraph: Any wallet pledges funds directly to the contract. No custody, no platform approving the flow.
    - listitem:
      - text: "03"
      - heading "Withdrawal when the creator decides" [level=3]
      - paragraph: Once the goal is reached, the creator withdraws via pull payment — never automatic, never forced.
    - listitem:
      - text: "04"
      - heading "Individual refund, always available" [level=3]
      - paragraph: A backer can request their refund at any time before the creator withdraws, without depending on others.
  - paragraph: Numbers that matter
  - heading "Real contract metrics — verified in every test, not in a pitch deck." [level=2]
  - text: < 0
  - paragraph: max. gas to create a project
  - paragraph: Automatically verified in every test — not a promise.
  - text: < 0
  - paragraph: max. gas per pledge
  - paragraph: Less gas = less cost for your end users.
  - text: 0 / 17
  - paragraph: unit tests in Phase 1
  - paragraph: Plus reentrancy suites, amount fuzzing, and deletion tests.
  - text: "0"
  - paragraph: critical vulnerabilities (Slither)
  - paragraph: 19 findings → 0 exploitable. Expected noise from standard libraries.
  - text: ~0
  - paragraph: gas saved per call
  - paragraph: ReentrancyGuardTransient (EIP-1153) vs. classic guard.
  - text: "0"
  - paragraph: functions that can lock funds
  - paragraph: "There's always an exit path: refund or claim."
  - paragraph: Tech stack
  - heading "Production tools, not tutorial tools." [level=2]
  - paragraph: Smart contracts
  - list:
    - listitem: Solidity 0.8.24+
    - listitem: Hardhat 3
    - listitem: OpenZeppelin v5.6.1
    - listitem: ReentrancyGuardTransient
    - listitem: SafeCast
    - listitem: node:test + viem
    - listitem: hardhat-viem-assertions
    - listitem: Slither
  - paragraph: Frontend
  - list:
    - listitem: React 19
    - listitem: TypeScript
    - listitem: Vite
    - listitem: Wagmi v3
    - listitem: Viem
    - listitem: TanStack Query
    - listitem: Tailwind CSS v4
    - listitem: shadcn/ui
    - listitem: GSAP
  - paragraph: Data infrastructure
  - list:
    - listitem: IPFS (Pinata)
    - listitem: Own Express backend
    - listitem: ECDSA signature auth (nonce)
    - listitem: Per-IP rate limit
    - listitem: No secrets in the bundle
  - paragraph: Networks
  - list:
    - listitem: Base (L2)
    - listitem: Ethereum Sepolia
    - listitem: Base Sepolia
    - listitem: Verified contract on explorer
  - paragraph: Security
  - heading "Design decisions a non-technical client can understand too." [level=2]
  - list:
    - listitem:
      - heading "Two-layer reentrancy protection" [level=3]
      - paragraph: Checks-effects-interactions pattern plus a transient guard on every fund-moving function. It's the defense against the most common attack on contracts holding money.
    - listitem:
      - heading "No admin, no rug pull possible by design" [level=3]
      - paragraph: There's no function that pauses, freezes, or redirects withdrawals. Not even the author can touch another user's funds.
    - listitem:
      - heading "Amounts with safe conversions" [level=3]
      - paragraph: "Numeric types sized to the real range (uint96) and SafeCast on every conversion: no value is ever truncated silently."
    - listitem:
      - heading "Typed errors and events on every action" [level=3]
      - paragraph: Custom errors instead of raw reverts, and on-chain events for full traceability from any indexer.
    - listitem:
      - heading "Protected project deletion" [level=3]
      - paragraph: A creator can only delete their campaign if there are no third-party funds at risk — never at a backer's expense.
  - paragraph: User experience
  - heading "On-chain complexity shouldn't reach the end user." [level=2]
  - list:
    - listitem: Readable transaction states (pending / confirming / success / error) — never a raw Solidity revert.
    - listitem: Detects unsupported networks or an undeployed contract, with clear instructions on which network to use.
    - listitem: "Truly mobile-adapted layout: buttons with a comfortable tap area, stacked forms instead of squeezed ones."
    - listitem: IPFS metadata (image, title, description, attached document) rendered inside the app — not raw JSON.
  - text: app.crowdfunding-dapp
  - paragraph: "Project #42"
  - paragraph: Prototype manufacturing
  - text: confirming · 2/3 3.42 / 5.00 ETH 68%
  - paragraph: Est. gas
  - paragraph: 118,244
  - paragraph: Network
  - paragraph: Base Sepolia
  - paragraph: Architecture decisions
  - heading "Every design choice has a documented reason, not just intuition." [level=2]
  - list:
    - listitem:
      - heading "No campaign deadline" [level=3]
      - paragraph: The creator withdraws whenever they decide; the backer can refund at any time before the claim. Fewer possible states, less bug surface.
    - listitem:
      - heading "Pull-payment pattern, never push" [level=3]
      - paragraph: Each user withdraws their own balance. No loop over backers that could block the contract due to a gas limit.
    - listitem:
      - heading "Own backend for IPFS" [level=3]
      - paragraph: The Pinata API key never travels to the public bundle. Only the server knows it; the frontend authenticates via wallet signature.
    - listitem:
      - heading "ReentrancyGuardTransient (EIP-1153)" [level=3]
      - paragraph: "Transient storage instead of classic storage: saves ~2.5k–5k gas per call, critical for the hard 120k gas limit on pledge."
  - paragraph: Live demo
  - heading "The real dApp, running right here." [level=2]
  - paragraph: Connect your wallet on Base Sepolia or Ethereum Sepolia to create a campaign, pledge, claim funds, or request a refund — against the real deployed contract.
  - heading "Crowdfunding DApp" [level=1]
  - button "Connect wallet"
  - paragraph: Read-only mode. Connect your wallet to pledge, create, or claim.
  - paragraph: Invalid request
  - heading "Fund real projects, with no middlemen" [level=1]
  - paragraph: "On-chain crowdfunding: the funds are held in custody by the contract, not by an administrator."
  - button "Explore projects"
  - button "Create project" [disabled]
  - heading "Your project could be next" [level=2]
  - button "Create project" [disabled]
  - paragraph: Connect your wallet to create a project.
  - paragraph: Let's work together
  - heading "Have a project that needs this level of on-chain rigor?" [level=2]
  - paragraph: Email me. I answer every message personally — we'll review your case and I'll tell you honestly if I'm the right person for it.
  - link "Send an email":
    - /url: mailto:fuentesabraham075@gmail.com
  - region "Closing message":
    - paragraph: Thanks for reading all the way through — if you made it here, we should probably talk.
    - paragraph: "[FILL IN: name] · Solidity engineering + web3 frontend"
```

# Test source

```ts
  1  | import { test, expect, gotoAppReady } from "./fixtures";
  2  | 
  3  | /**
  4  |  * Happy path (docs/09_ROADMAP_MEJORAS.md § 12, entregable 1): create project
  5  |  * → pledge from a second wallet → claim from the first wallet → the "Claim
  6  |  * funds" button disappears once claimed. Runs against a real deployed
  7  |  * Crowdfunding instance on Anvil (see scripts/e2e-setup.ts) — this is the
  8  |  * exact frontend↔contract integration layer where this project's 2 real bugs
  9  |  * happened (canClaim/canRefund, toProject destructuring — docs/05_CRITICAL_REVIEW.md).
  10 |  */
  11 | 
  12 | const GOAL_ETH = "0.01";
  13 | // Unique per run so re-running the suite against the same Anvil chain
  14 | // (without wiping state) never collides with a project from a previous run.
  15 | const PROJECT_TITLE = `E2E happy path ${Date.now()}`;
  16 | 
  17 | test("create → pledge → claim", async ({ creatorPage, backerPage }) => {
  18 |   // --- Creator: connect + create the project ---
  19 |   await gotoAppReady(creatorPage);
  20 |   const creatorDemo = creatorPage.locator("#demo");
  21 |   await creatorDemo.scrollIntoViewIfNeeded();
  22 |   await creatorDemo.getByRole("button", { name: "Connect wallet" }).click();
> 23 |   await expect(creatorDemo.getByText(/0xf39F.*9226/)).toBeVisible({ timeout: 15_000 });
     |                                                       ^ Error: expect(locator).toBeVisible() failed
  24 | 
  25 |   // .hero-actions scopes this to the Hero's primary CTA — LandingCTA further
  26 |   // down the same #demo section renders a second button with the identical
  27 |   // accessible name "Create project", which makes an unscoped locator ambiguous.
  28 |   await creatorDemo.locator(".hero-actions").getByRole("button", { name: "Create project" }).click();
  29 |   await creatorDemo.getByPlaceholder("Title").fill(PROJECT_TITLE);
  30 |   await creatorDemo.getByPlaceholder("Description").fill("Created by the Playwright E2E suite.");
  31 |   await creatorDemo.getByPlaceholder("Minimum goal (ETH)").fill(GOAL_ETH);
  32 |   await creatorDemo.getByRole("button", { name: "Create project" }).click();
  33 | 
  34 |   // Back in the list view once useCreateProject's status hits "success" (see AppShell's onCreated).
  35 |   const projectCard = creatorDemo.locator(".project-card", { hasText: PROJECT_TITLE });
  36 |   await expect(projectCard).toBeVisible({ timeout: 30_000 });
  37 | 
  38 |   // --- Backer: connect + pledge exactly the goal amount ---
  39 |   await gotoAppReady(backerPage);
  40 |   const backerDemo = backerPage.locator("#demo");
  41 |   await backerDemo.scrollIntoViewIfNeeded();
  42 |   await backerDemo.getByRole("button", { name: "Connect wallet" }).click();
  43 |   await expect(backerDemo.getByText(/0x7099.*79C8/)).toBeVisible({ timeout: 15_000 });
  44 | 
  45 |   await backerDemo.getByRole("button", { name: "Explore projects" }).click();
  46 |   await backerDemo.locator(".project-card", { hasText: PROJECT_TITLE }).click();
  47 | 
  48 |   await backerDemo.getByPlaceholder("Amount in ETH").fill(GOAL_ETH);
  49 |   await backerDemo.getByRole("button", { name: "Pledge", exact: true }).click();
  50 |   await expect(backerDemo.getByText(`Raised: ${GOAL_ETH} ETH of ${GOAL_ETH} ETH`)).toBeVisible({
  51 |     timeout: 30_000,
  52 |   });
  53 | 
  54 |   // --- Creator: reload to pick up the now-successful project, then claim ---
  55 |   await creatorPage.reload();
  56 |   await creatorDemo.scrollIntoViewIfNeeded();
  57 |   await creatorDemo.getByRole("button", { name: "Explore projects" }).click();
  58 |   await creatorDemo.locator(".project-card", { hasText: PROJECT_TITLE }).click();
  59 | 
  60 |   const claimButton = creatorDemo.getByRole("button", { name: "Claim funds" });
  61 |   await expect(claimButton).toBeVisible();
  62 |   await claimButton.click();
  63 | 
  64 |   // The exact assertion this roadmap point asks for: the button disappears
  65 |   // once the claim is confirmed (canClaimProject() becomes false — claimed === true).
  66 |   await expect(claimButton).toHaveCount(0, { timeout: 30_000 });
  67 | });
  68 | 
```