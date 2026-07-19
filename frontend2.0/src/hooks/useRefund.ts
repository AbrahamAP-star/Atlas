import { useWriteContract } from "wagmi";
import type { Address } from "viem";
import { crowdfundingAbi } from "@/contracts/crowdfundingConfig";
import { useTxStatus } from "./useTxStatus";

// Migrated 1:1 from frontend/src/hooks/useRefund.ts (docs/08_FRONTEND_MIGRATION.md).

/** Refunds your own pledge on a project, at any time as long as the creator
 *  hasn't claimed the funds (no longer depends on whether the goal was reached). */
export function useRefund(address: Address | undefined) {
  const { writeContract, data: hash, error, reset } = useWriteContract();
  const { status, errorMessage } = useTxStatus(hash, error);

  function refund(id: number) {
    if (!address) return;
    reset();
    writeContract({
      address,
      abi: crowdfundingAbi,
      functionName: "refund",
      args: [BigInt(id)],
      // See comment in useCreateProject.ts: explicit gas, not estimated.
      gas: 200_000n,
    });
  }

  return { refund, status, errorMessage, hash };
}
