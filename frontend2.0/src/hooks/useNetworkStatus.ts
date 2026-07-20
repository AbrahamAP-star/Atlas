import { useAccount } from "wagmi";
import {
  getCrowdfundingAddress,
  supportedChains,
  deployedChains,
  defaultReadChainId,
} from "@/contracts/crowdfundingConfig";

// Migrated 1:1 from frontend/src/hooks/useNetworkStatus.ts (docs/08_FRONTEND_MIGRATION.md).
// Only change: imports via the "@/..." alias.

export type NetworkKind =
  "disconnected" | "unsupported-chain" | "not-deployed" | "ready";

/**
 * Single source of truth for the active network and whether the contract can
 * be interacted with. Uses useAccount().chainId (not useChainId) because
 * useChainId masks unconfigured networks by returning the last known network
 * instead of the wallet's real one.
 */
export function useNetworkStatus() {
  const { chainId: walletChainId, isConnected } = useAccount();

  // No wallet: browse in read-only mode on the first network with a real deploy.
  const activeChainId = isConnected ? walletChainId! : defaultReadChainId;
  const isSupportedChain = supportedChains.some(
    (chain) => chain.id === activeChainId,
  );
  const address = isSupportedChain
    ? getCrowdfundingAddress(activeChainId)
    : undefined;

  let kind: NetworkKind;
  if (!isConnected) kind = "disconnected";
  else if (!isSupportedChain) kind = "unsupported-chain";
  else if (!address) kind = "not-deployed";
  else kind = "ready";

  return {
    kind,
    isConnected,
    activeChainId,
    address,
    canInteract: kind === "ready",
    supportedChainNames: supportedChains.map((c) => c.name),
    deployedChainNames: deployedChains.map((c) => c.name),
  };
}
