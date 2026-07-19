import { randomBytes } from "node:crypto";
import { NONCE_TTL_MS } from "./config.js";

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const nonces = new Map<string, NonceEntry>();

export function buildSignMessage(nonce: string): string {
  return `Authorize IPFS upload.\nThis code is single-use.\nNonce: ${nonce}`;
}

/** Generates a new nonce for the wallet, replacing any previous unused nonce. */
export function issueNonce(address: string): { nonce: string; message: string } {
  const nonce = randomBytes(16).toString("hex");
  nonces.set(address.toLowerCase(), { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return { nonce, message: buildSignMessage(nonce) };
}

/** Returns the wallet's active nonce, or undefined if none exists or it already expired. */
export function peekNonce(address: string): NonceEntry | undefined {
  const key = address.toLowerCase();
  const entry = nonces.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    nonces.delete(key);
    return undefined;
  }
  return entry;
}

/** Invalidates the wallet's nonce: always called after verification, whether the signature was valid or not. */
export function consumeNonce(address: string): void {
  nonces.delete(address.toLowerCase());
}
