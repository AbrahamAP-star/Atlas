import { useWriteContract } from "wagmi";
import type { Address } from "viem";
import { crowdfundingAbi } from "@/contracts/crowdfundingConfig";
import { useTxStatus } from "./useTxStatus";

// Migrated 1:1 from frontend/src/hooks/usePledge.ts (docs/08_FRONTEND_MIGRATION.md).

/** Sends a pledge (in wei) to project id. */
export function usePledge(address: Address | undefined) {
  const { writeContract, data: hash, error, reset } = useWriteContract();
  const { status, errorMessage } = useTxStatus(hash, error);

  function pledge(id: number, valueWei: bigint) {
    if (!address) return;
    reset();
    writeContract({
      address,
      abi: crowdfundingAbi,
      functionName: "pledge",
      args: [BigInt(id)],
      value: valueWei,
      // See equivalent comment in useCreateProject.ts: explicit gas to avoid
      // relying on a wallet estimate that can fail. Documented hard cap
      // <120k gas; 200k leaves a reasonable margin.
      gas: 200_000n,
    });
  }

  return { pledge, status, errorMessage, hash };
}
