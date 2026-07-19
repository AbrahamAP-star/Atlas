import { useQuery } from "@tanstack/react-query";

// Migrated 1:1 from frontend/src/hooks/useProjectMetadata.ts (docs/08_FRONTEND_MIGRATION.md).
// No import changes (it no longer depended on relative paths from the old frontend).

export interface CampaignMetadata {
  title: string;
  description: string;
  imageCID?: string;
  documentCID?: string;
}

// Pinata gateway (not ipfs.io): content freshly pinned on the free plan can
// take a while to propagate to the public IPFS network. Same gateway already
// used by the "view raw JSON" link in ProjectDetail.
function gatewayUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

/** Fetches and caches (react-query) a campaign's metadata JSON from IPFS.
 *  On-chain only stores the CID; title/description/image live here. */
export function useProjectMetadata(metadataCID: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["project-metadata", metadataCID],
    queryFn: async (): Promise<CampaignMetadata> => {
      const res = await fetch(gatewayUrl(metadataCID!));
      if (!res.ok) throw new Error("Could not load metadata from IPFS.");
      return res.json();
    },
    enabled: !!metadataCID,
    staleTime: Infinity, // the CID is immutable: the same content never changes
    retry: 1,
  });

  return {
    metadata: data,
    imageUrl: data?.imageCID ? gatewayUrl(data.imageCID) : undefined,
    documentUrl: data?.documentCID ? gatewayUrl(data.documentCID) : undefined,
    isLoading,
    error,
  };
}
