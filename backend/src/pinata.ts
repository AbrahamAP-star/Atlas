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
  form.append("file", new Blob([buffer], { type: mimetype }), filename);

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
