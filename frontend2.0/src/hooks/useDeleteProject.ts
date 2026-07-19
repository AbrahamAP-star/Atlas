import { useWriteContract } from "wagmi";
import type { Address } from "viem";
import { crowdfundingAbi } from "@/contracts/crowdfundingConfig";
import { useTxStatus } from "./useTxStatus";

// Migrated 1:1 from frontend/src/hooks/useDeleteProject.ts (docs/08_FRONTEND_MIGRATION.md).

/** The creator deletes their own project (only if there are no unclaimed pledges). */
export function useDeleteProject(address: Address | undefined) {
  const { writeContract, data: hash, error, reset } = useWriteContract();
  const { status, errorMessage } = useTxStatus(hash, error);

  function deleteProject(id: number) {
    if (!address) return;
    reset();
    writeContract({
      address,
      abi: crowdfundingAbi,
      functionName: "deleteProject",
      args: [BigInt(id)],
      // See comment in useCreateProject.ts: explicit gas, not estimated.
      // No external interaction (just a delete SSTORE), 120k leaves comfortable margin.
      gas: 120_000n,
    });
  }

  return { deleteProject, status, errorMessage, hash };
}
