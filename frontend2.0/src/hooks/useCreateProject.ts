import { useWriteContract } from "wagmi";
import type { Address } from "viem";
import { crowdfundingAbi } from "@/contracts/crowdfundingConfig";
import { useTxStatus } from "./useTxStatus";

// Migrated 1:1 from frontend/src/hooks/useCreateProject.ts (docs/08_FRONTEND_MIGRATION.md).

/** Creates a project: takes the minimum goal in wei (amount that unlocks
 *  withdrawal) and the already-uploaded IPFS CID. No duration: the project
 *  stays open indefinitely until the creator decides to claim (`claimFunds`). */
export function useCreateProject(address: Address | undefined) {
  const { writeContract, data: hash, error, reset } = useWriteContract();
  const { status, errorMessage } = useTxStatus(hash, error);

  function createProject(goalWei: bigint, metadataCID: string) {
    if (!address) return;
    reset();
    writeContract({
      address,
      abi: crowdfundingAbi,
      functionName: "createProject",
      args: [goalWei, metadataCID],
      // Explicit gas instead of letting the wallet estimate it: if
      // eth_estimateGas fails on the RPC side (seen with Infura+Sepolia,
      // "gas limit too high" error), some wallets fall back to a huge value
      // (the block's gas limit) that the RPC itself rejects. This function's
      // hard budget is <350k gas (00_PROJECT_OVERVIEW.md); 400k leaves margin
      // and still stays well under any network limit.
      gas: 400_000n,
    });
  }

  return { createProject, status, errorMessage, hash };
}
