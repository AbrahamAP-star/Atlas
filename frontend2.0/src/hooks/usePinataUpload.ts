import { useState } from "react";
import { useIpfsAuth } from "./useIpfsAuth";

// Migrated 1:1 from frontend/src/hooks/usePinataUpload.ts (docs/08_FRONTEND_MIGRATION.md).

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:3001";

interface CampaignMetadata {
  title: string;
  description: string;
  imageCID?: string;
  documentCID?: string;
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => undefined);
  return body?.error ?? fallback;
}

async function uploadFile(file: File, token: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BACKEND_URL}/api/pin-file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Could not upload the file to IPFS."));
  const data = await res.json();
  return data.cid as string;
}

async function uploadMetadata(metadata: CampaignMetadata, token: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/pin-json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(metadata),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Could not upload the project information to IPFS."));
  const data = await res.json();
  return data.cid as string;
}

/** Uploads (optional) image + metadata JSON to IPFS via our own backend; returns the final CID.
 *  Requests a single wallet signature per call (session token) that covers image + document + metadata. */
export function usePinataUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { getSessionToken } = useIpfsAuth();

  async function upload(
    title: string,
    description: string,
    image?: File,
    document?: File,
  ): Promise<string | undefined> {
    setIsUploading(true);
    setError(undefined);
    try {
      const token = await getSessionToken();
      const imageCID = image ? await uploadFile(image, token) : undefined;
      const documentCID = document ? await uploadFile(document, token) : undefined;
      return await uploadMetadata({ title, description, imageCID, documentCID }, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading to IPFS.");
      return undefined;
    } finally {
      setIsUploading(false);
    }
  }

  return { upload, isUploading, error };
}
