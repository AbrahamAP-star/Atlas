import { sepolia, baseSepolia } from "wagmi/chains";
import type { Address } from "viem";
import { crowdfundingAbi } from "./crowdfundingAbi";
import { wagmiConfig } from "@/wagmi";

// Migrated from frontend/src/contracts/crowdfundingConfig.ts (same logic,
// only change is the wagmiConfig import via the "@/wagmi" alias instead of
// the relative "../wagmi", see docs/08_FRONTEND_MIGRATION.md).
//
// Deployed address by chain id. Sepolia already has a real deploy (see
// /deployments/sepolia.json); Base Sepolia is still pending funds (Phase 3).
export const crowdfundingAddresses: Record<number, Address | undefined> = {
  [sepolia.id]: import.meta.env.VITE_CROWDFUNDING_ADDRESS_SEPOLIA as
    Address | undefined,
  [baseSepolia.id]: import.meta.env.VITE_CROWDFUNDING_ADDRESS_BASE_SEPOLIA as
    Address | undefined,
};

export function getCrowdfundingAddress(chainId: number): Address | undefined {
  return crowdfundingAddresses[chainId];
}

// Block explorer by chain id, used to link a tx's hash.
const explorerBaseUrls: Record<number, string> = {
  [sepolia.id]: "https://sepolia.etherscan.io",
  [baseSepolia.id]: "https://sepolia.basescan.org",
};

export function getExplorerTxUrl(
  chainId: number,
  hash: string,
): string | undefined {
  const base = explorerBaseUrls[chainId];
  return base ? `${base}/tx/${hash}` : undefined;
}

export { crowdfundingAbi };

// Networks configured in the app (regardless of whether the contract is already deployed there).
export const supportedChains = wagmiConfig.chains;

// Only the supported networks where the contract DOES have a deployed address.
export const deployedChains = supportedChains.filter(
  (chain) => !!crowdfundingAddresses[chain.id],
);

// Network used for read-only mode before connecting a wallet: the first
// supported network that already has the contract deployed (avoids
// defaulting to a network without a deploy just because it's first in the chains array).
export const defaultReadChainId =
  deployedChains[0]?.id ?? supportedChains[0].id;
