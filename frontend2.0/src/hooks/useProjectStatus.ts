import { zeroAddress } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { crowdfundingAbi } from "@/contracts/crowdfundingConfig";
import { useNetworkStatus } from "./useNetworkStatus";

// Migrated 1:1 from frontend/src/hooks/useProjectStatus.ts (docs/08_FRONTEND_MIGRATION.md).
// Only change: imports via the "@/..." alias.

/** Reads isSuccessful/pledgeOf(current user) to decide which buttons to show.
 *  No longer reads `isExpired` (doesn't exist anymore, the project has no deadline). */
export function useProjectStatus(id: number) {
  const { address } = useNetworkStatus();
  const { address: account } = useAccount();

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { address, abi: crowdfundingAbi, functionName: "isSuccessful", args: [BigInt(id)] },
      { address, abi: crowdfundingAbi, functionName: "pledgeOf", args: [BigInt(id), account ?? zeroAddress] },
    ],
    query: { enabled: !!address },
  });

  return {
    isSuccessful: (data?.[0]?.result as boolean | undefined) ?? false,
    myPledge: (data?.[1]?.result as bigint | undefined) ?? 0n,
    isLoading,
    refetch,
    address,
    account,
  };
}
