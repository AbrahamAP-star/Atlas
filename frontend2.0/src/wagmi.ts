import { createConfig, http, injected } from "wagmi";
import { sepolia, baseSepolia, foundry, type Chain } from "wagmi/chains";

// Testnets only for now (Phase 4/5, see docs/03_PLAN_FASES.md). Base mainnet
// is added in Phase 6. injected() covers MetaMask via EIP-6963 auto-discovery
// with no extra config.
//
// E2E-only chain (docs/09_ROADMAP_MEJORAS.md §12): `foundry` (chainId 31337,
// wagmi's built-in definition for a local Anvil node) is added ONLY when
// VITE_E2E=true, a flag set exclusively by scripts/e2e-setup.ts's generated
// .env.e2e.local (see frontend2.0/e2e/README.md). Production builds never
// see this env var, so the real app's chain list is unchanged.
const chains: readonly [Chain, ...Chain[]] =
  import.meta.env.VITE_E2E === "true" ? [foundry, baseSepolia, sepolia] : [baseSepolia, sepolia];

// `ssr: true` (added during the migration to frontend2.0/TanStack Start,
// docs/08_FRONTEND_MIGRATION.md): the old frontend was a Vite SPA with no
// server render, so wagmi never ran outside the browser. Now that the same
// component tree can render on the server (SSR), wagmi needs to know the
// first server render has no access to wallet/localStorage: `ssr: true`
// makes that first render return a consistent "disconnected" state, and the
// real wallet only hydrates on the client - avoids React's hydration
// warning/mismatch. Doesn't change any business logic, purely SSR compatibility.
export const wagmiConfig = createConfig({
  chains,
  connectors: [injected()],
  ssr: true,
  transports: {
    [foundry.id]: http(),
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
