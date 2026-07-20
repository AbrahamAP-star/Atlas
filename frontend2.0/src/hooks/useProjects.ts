import { useReadContract, useReadContracts } from "wagmi";
import { crowdfundingAbi } from "@/contracts/crowdfundingConfig";
import { useNetworkStatus } from "./useNetworkStatus";

// Migrated 1:1 from frontend/src/hooks/useProjects.ts (docs/08_FRONTEND_MIGRATION.md).
// Only change: imports via the "@/..." alias.

// Structure exactly as returned by getProject (same order as the Solidity struct).
// No `deadline`: the project no longer has a deadline, see 04_STATUS.md.
export interface Project {
  creator: `0x${string}`;
  goal: bigint;
  pledged: bigint;
  claimed: boolean;
  metadataCID: string;
}

// getProject returns a tuple with ALL its components named, so viem decodes
// it as a plain object (not an array) — it can't be destructured via array
// destructuring. See 04_STATUS.md § "raw is not iterable".
function toProject(raw: {
  creator: `0x${string}`;
  goal: bigint;
  pledged: bigint;
  claimed: boolean;
  metadataCID: string;
}): Project {
  const { creator, goal, pledged, claimed, metadataCID } = raw;
  return { creator, goal, pledged, claimed, metadataCID };
}

/** Reads nextProjectId and then batches (multicall) getProject(0..n-1). */
export function useProjects() {
  const { address } = useNetworkStatus();

  const { data: nextProjectId, isLoading: loadingCount } = useReadContract({
    address,
    abi: crowdfundingAbi,
    functionName: "nextProjectId",
    query: { enabled: !!address },
  });

  const count = nextProjectId ?? 0;
  const contracts = Array.from({ length: count }, (_, id) => ({
    address,
    abi: crowdfundingAbi,
    functionName: "getProject" as const,
    args: [BigInt(id)] as const,
  }));

  const { data, isLoading: loadingProjects } = useReadContracts({
    contracts,
    query: { enabled: !!address && count > 0 },
  });

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  const projects: { id: number; project: Project }[] =
    data
      ?.map((result, id) =>
        result.status === "success"
          ? { id, project: toProject(result.result) }
          : null,
      )
      // A deleted project (deleteProject) leaves `creator == address(0)`: it's
      // filtered out of the listing instead of shown as a "ghost project" with no real data.
      .filter(
        (entry): entry is { id: number; project: Project } =>
          entry !== null && entry.project.creator !== ZERO_ADDRESS,
      ) ?? [];

  return {
    projects,
    isLoading: loadingCount || loadingProjects,
    contractAddress: address,
  };
}

/** Reads a single project by id (used in the detail view). */
export function useProject(id: number) {
  const { address } = useNetworkStatus();

  const { data, isLoading, error, refetch } = useReadContract({
    address,
    abi: crowdfundingAbi,
    functionName: "getProject",
    args: [BigInt(id)],
    query: { enabled: !!address },
  });

  return {
    project: data ? toProject(data) : undefined,
    isLoading,
    error,
    contractAddress: address,
    refetch,
  };
}
