import { createConfig, http, injected } from "wagmi";
import { sepolia, baseSepolia } from "wagmi/chains";

// Testnets only for now (Phase 4/5, see docs/03_PLAN_FASES.md). Base mainnet
// is added in Phase 6. injected() covers MetaMask via EIP-6963 auto-discovery
// with no extra config.
//
// `ssr: true` (added during the migration to frontend2.0/TanStack Start,
// docs/08_FRONTEND_MIGRATION.md): the old frontend was a Vite SPA with no
// server render, so wagmi never ran outside the browser. Now that the same
// component tree can render on the server (SSR), wagmi needs to know the
// first server render has no access to wallet/localStorage: `ssr: true`
// makes that first render return a consistent "disconnected" state, and the
// real wallet only hydrates on the client - avoids React's hydration
// warning/mismatch. Doesn't change any business logic, purely SSR compatibility.
export const wagmiConfig = createConfig({
  chains: [baseSepolia, sepolia],
  connectors: [injected()],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
