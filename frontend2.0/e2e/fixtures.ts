import { randomUUID } from "node:crypto";
import { test as base, type Page } from "@playwright/test";

/**
 * Anvil's well-known default test accounts (derived from the public test
 * mnemonic "test test test test test test test test test test test junk",
 * documented at book.getfoundry.sh/reference/anvil). These are NOT secrets —
 * never reuse them for anything beyond a local Anvil node.
 */
export const ANVIL_ACCOUNTS = {
  creator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  backer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
} as const;

/**
 * Injects a minimal EIP-1193 provider at `window.ethereum` before any page
 * script runs. Anvil's default accounts are pre-unlocked on the node itself
 * (same behavior as Hardhat's local node), so Anvil signs
 * eth_sendTransaction/personal_sign server-side once `from` matches one of
 * them — this provider only needs to forward JSON-RPC calls, no private key
 * or signing logic lives in the browser.
 *
 * Deliberately NOT using Synpress/real MetaMask automation here (see
 * docs/09_ROADMAP_MEJORAS.md § 12): wagmi's `injected()` connector only
 * needs a standard EIP-1193 object, and testing MetaMask's own popup UI
 * isn't this project's concern — only the frontend↔contract integration is.
 */
function injectedProviderScript(account: string): string {
  return `(() => {
    const RPC_URL = "http://127.0.0.1:8545";
    const ACCOUNT = "${account}";

    async function rpc(method, params) {
      // Content-Type is required: without it Anvil can't parse the body as a
      // valid JSON-RPC request and replies with the generic -32600 "Invalid
      // Request" error (confirmed via trace: connect.mutate failed with that
      // exact message on the first real call, eth_chainId). Anvil's CORS is
      // permissive by default, so the resulting preflight isn't an issue.
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params: params ?? [] }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || "Anvil RPC error");
      return json.result;
    }

    window.ethereum = {
      isMetaMask: true,
      request: async ({ method, params }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [ACCOUNT];
        if (method === "eth_sendTransaction") {
          const tx = { ...(params?.[0] ?? {}), from: ACCOUNT };
          return rpc("eth_sendTransaction", [tx]);
        }
        if (method === "personal_sign") {
          const [message] = params ?? [];
          return rpc("personal_sign", [message, ACCOUNT]);
        }
        return rpc(method, params);
      },
      on: () => {},
      removeListener: () => {},
    };
  })();`;
}

/** In-memory stand-in for Pinata: what `/api/pin-json` "pins" is what the
 *  gateway later "serves" back — keeps useProjectMetadata() working without
 *  a real IPFS gateway. Shared between creatorPage/backerPage (see the
 *  sharedMetadataStore fixture below) so a project the creator makes is
 *  immediately readable from the backer's page, same as real IPFS would be. */
type MetadataStore = Map<string, unknown>;

/**
 * Mocks the backend's auth + IPFS endpoints, AND the Pinata gateway itself,
 * at the network level (Playwright intercepts before any request reaches a
 * real port) — no need to run /backend or hold a real Pinata account. This
 * is intentional scope-narrowing: IPFS pinning isn't where this project's
 * real bugs happened (see docs/05_CRITICAL_REVIEW.md), the contract
 * integration is. personal_sign itself still runs for real (see
 * injectedProviderScript above) — only the backend's verification of it and
 * the IPFS round-trip are stubbed.
 */
async function mockBackend(
  page: Page,
  metadataStore: MetadataStore,
): Promise<void> {
  await page.route("**/api/auth/nonce", (route) =>
    route.fulfill({ json: { message: "e2e-test-nonce-message" } }),
  );
  await page.route("**/api/auth/verify", (route) =>
    route.fulfill({ json: { token: "e2e-test-session-token" } }),
  );

  // randomUUID(), not an incrementing counter: a counter restarts at 0 on
  // every test (mockBackend runs once per page), so two projects created by
  // different spec files could land on the identical fake CID and collide in
  // useProjectMetadata's CID-keyed cache — one project's card would then
  // silently render with the other project's title.
  await page.route("**/api/pin-file", (route) =>
    route.fulfill({ json: { cid: `QmE2EFile${randomUUID()}` } }),
  );
  await page.route("**/api/pin-json", (route) => {
    const cid = `QmE2EJson${randomUUID()}`;
    metadataStore.set(cid, route.request().postDataJSON());
    return route.fulfill({ json: { cid } });
  });

  // useProjectMetadata() fetches this exact URL pattern to read a
  // campaign's title/description/image CID (see hooks/useProjectMetadata.ts).
  await page.route("https://gateway.pinata.cloud/ipfs/**", (route) => {
    const cid = new URL(route.request().url()).pathname.split("/").pop() ?? "";
    const metadata = metadataStore.get(cid);
    if (!metadata)
      return route.fulfill({
        status: 404,
        json: { error: "unknown CID in this e2e run" },
      });
    return route.fulfill({ json: metadata });
  });
}

interface Fixtures {
  sharedMetadataStore: MetadataStore;
  creatorPage: Page;
  backerPage: Page;
}

/**
 * Vite dev mode serves ~60 unbundled ES modules per initial load; `goto("/")`
 * resolves on the "load" event (the SSR'd HTML document itself), which can
 * fire well before React finishes downloading/hydrating. The SSR markup
 * already shows real buttons (visible, enabled) with no React listener
 * attached yet, so a click right after `goto` can land on inert HTML and
 * silently do nothing — no error, no network call, just a no-op click.
 * Waiting for the network to go idle here (not per-spec) closes that gap
 * once, at the source, instead of every call site guessing a fixed delay.
 */
async function gotoAppReady(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

/** Prints browser console messages/errors to the Node terminal running
 *  Playwright, prefixed by persona ("creator"/"backer") — without this, a
 *  silent JS exception inside wagmi's connect flow (e.g. our mock provider
 *  rejecting) never surfaces anywhere except a Playwright trace file. */
function logBrowserActivity(page: Page, persona: string): void {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[${persona}:console:${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) =>
    console.log(`[${persona}:pageerror] ${error.message}`),
  );
}

/** Two independent browser contexts sharing the same real Anvil chain state —
 *  a tx sent from creatorPage is immediately visible to backerPage, exactly
 *  like two different people using two different browsers against the same
 *  deployed contract. sharedMetadataStore is fresh per test (default fixture
 *  scope), never leaks between spec files. */
export const test = base.extend<Fixtures>({
  sharedMetadataStore: async (_fixtures, use) => {
    await use(new Map());
  },
  creatorPage: async ({ browser, sharedMetadataStore }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    logBrowserActivity(page, "creator");
    await page.addInitScript(injectedProviderScript(ANVIL_ACCOUNTS.creator));
    await mockBackend(page, sharedMetadataStore);
    await use(page);
    await context.close();
  },
  backerPage: async ({ browser, sharedMetadataStore }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    logBrowserActivity(page, "backer");
    await page.addInitScript(injectedProviderScript(ANVIL_ACCOUNTS.backer));
    await mockBackend(page, sharedMetadataStore);
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
export { gotoAppReady };
