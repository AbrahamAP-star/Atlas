const PINATA_JWT = process.env.PINATA_JWT;

/** Fails fast with a clear message instead of letting Pinata return a generic 401. */
function requirePinataJwt(): string {
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT not configured in backend/.env — see 05_CRITICAL_REVIEW.md.");
  }
  return PINATA_JWT;
}

interface CampaignMetadata {
  title: string;
  description: string;
  imageCID?: string;
  documentCID?: string;
}

async function parseIpfsHash(res: Response): Promise<string> {
  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

/** Uploads a binary file (image or document) to Pinata via pinFileToIPFS. */
export async function pinFileToIPFS(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const jwt = requirePinataJwt();
  const form = new FormData();
  // Buffer.buffer is typed as ArrayBufferLike (could be SharedArrayBuffer), which Blob's
  // BlobPart type rejects. Wrapping in a fresh Uint8Array guarantees a real ArrayBuffer backing.
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimetype }), filename);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Pinata pinFileToIPFS failed (${res.status}).`);
  return parseIpfsHash(res);
}

/** Uploads a campaign's metadata JSON to Pinata via pinJSONToIPFS. */
export async function pinJSONToIPFS(metadata: CampaignMetadata): Promise<string> {
  const jwt = requirePinataJwt();
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pinataContent: metadata }),
  });
  if (!res.ok) throw new Error(`Pinata pinJSONToIPFS failed (${res.status}).`);
  return parseIpfsHash(res);
}

/**
 * Point 11 of docs/09_ROADMAP_MEJORAS.md: emergency "unpin" used by
 * POST /api/admin/unpin to retire content that gets reported (illegal/abusive
 * content inside an otherwise valid PDF/image, which MIME/size checks can't
 * catch). Unpinning does NOT delete the bytes from the wider IPFS network if
 * another node already pinned them, only from Abraham's Pinata account — see
 * the caveat already documented in this same section of 05_CRITICAL_REVIEW.md
 * about IPFS content being addressable, not owned.
 */
export async function unpinFromIPFS(cid: string): Promise<void> {
  const jwt = requirePinataJwt();
  const res = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) throw new Error(`Pinata unpin failed (${res.status}).`);
}
