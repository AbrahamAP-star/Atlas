import { useWriteContract } from "wagmi";
import type { Address } from "viem";
import { crowdfundingAbi } from "@/contracts/crowdfundingConfig";
import { useTxStatus } from "./useTxStatus";

// Migrated 1:1 from frontend/src/hooks/useClaimFunds.ts (docs/08_FRONTEND_MIGRATION.md).

/** Claims the funds of a successful project (only the creator can call this). */
export function useClaimFunds(address: Address | undefined) {
  const { writeContract, data: hash, error, reset } = useWriteContract();
  const { status, errorMessage } = useTxStatus(hash, error);

  function claimFunds(id: number) {
    if (!address) return;
    reset();
    writeContract({
      address,
      abi: crowdfundingAbi,
      functionName: "claimFunds",
      args: [BigInt(id)],
      // See comment in useCreateProject.ts: explicit gas, not estimated.
      // claimFunds includes an interaction (transfer .call); 200k leaves
      // comfortable margin over a simple SSTORE + call.
      gas: 200_000n,
    });
  }

  return { claimFunds, status, errorMessage, hash };
}
