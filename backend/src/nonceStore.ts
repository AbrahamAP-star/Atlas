import { randomBytes } from "node:crypto";
import { db } from "./db.js";
import { NONCE_TTL_MS } from "./config.js";

// Same public API as before (backend/05_CRITICAL_REVIEW.md/04_STATUS.md
// § "Autenticacion por wallet"), now backed by SQLite instead of a Map so a
// backend restart doesn't silently invalidate an in-flight signature flow.

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const upsertNonce = db.prepare(`
  INSERT INTO nonces (address, nonce, expires_at) VALUES (?, ?, ?)
  ON CONFLICT(address) DO UPDATE SET nonce = excluded.nonce, expires_at = excluded.expires_at
`);
const selectNonce = db.prepare("SELECT nonce, expires_at AS expiresAt FROM nonces WHERE address = ?");
const deleteNonce = db.prepare("DELETE FROM nonces WHERE address = ?");

export function buildSignMessage(nonce: string): string {
  return `Authorize IPFS upload.\nThis code is single-use.\nNonce: ${nonce}`;
}

/** Generates a new nonce for the wallet, replacing any previous unused nonce. */
export function issueNonce(address: string): { nonce: string; message: string } {
  const nonce = randomBytes(16).toString("hex");
  upsertNonce.run(address.toLowerCase(), nonce, Date.now() + NONCE_TTL_MS);
  return { nonce, message: buildSignMessage(nonce) };
}

/** Returns the wallet's active nonce, or undefined if none exists or it already expired. */
export function peekNonce(address: string): NonceEntry | undefined {
  const key = address.toLowerCase();
  const row = selectNonce.get(key) as NonceEntry | undefined;
  if (!row) return undefined;
  if (Date.now() > row.expiresAt) {
    deleteNonce.run(key);
    return undefined;
  }
  return row;
}

/** Invalidates the wallet's nonce: always called after verification, whether the signature was valid or not. */
export function consumeNonce(address: string): void {
  deleteNonce.run(address.toLowerCase());
}
