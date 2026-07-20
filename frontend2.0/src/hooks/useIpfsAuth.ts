import { useAccount, useSignMessage } from "wagmi";

// Migrated 1:1 from frontend/src/hooks/useIpfsAuth.ts (docs/08_FRONTEND_MIGRATION.md).

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  "http://localhost:3001";

async function readErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const body = await res.json().catch(() => undefined);
  return body?.error ?? fallback;
}

/** Exchanges a wallet signature for a short-lived session token that authorizes
 *  IPFS uploads. The backend generates a single-use nonce per wallet: if
 *  someone steals the resulting signature, it's useless after this exchange. */
export function useIpfsAuth() {
  const { address } = useAccount();
  const signMessage = useSignMessage();

  async function getSessionToken(): Promise<string> {
    if (!address) throw new Error("Connect your wallet to upload files.");

    const nonceRes = await fetch(`${BACKEND_URL}/api/auth/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!nonceRes.ok)
      throw new Error(
        await readErrorMessage(
          nonceRes,
          "Could not start the signing process.",
        ),
      );
    const { message } = (await nonceRes.json()) as { message: string };

    const signature = await signMessage.mutateAsync({ message });

    const verifyRes = await fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, signature }),
    });
    if (!verifyRes.ok)
      throw new Error(
        await readErrorMessage(
          verifyRes,
          "The signature could not be verified.",
        ),
      );
    const { token } = (await verifyRes.json()) as { token: string };
    return token;
  }

  return { getSessionToken };
}
