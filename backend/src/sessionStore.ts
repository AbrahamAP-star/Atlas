import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { SESSION_TTL_MS } from "./config.js";

// Same public API as before, now backed by SQLite instead of a Map — see nonceStore.ts.

interface Session {
  address: string;
  expiresAt: number;
}

const insertSession = db.prepare("INSERT INTO sessions (token, address, expires_at) VALUES (?, ?, ?)");
const selectSession = db.prepare("SELECT address, expires_at AS expiresAt FROM sessions WHERE token = ?");
const deleteSession = db.prepare("DELETE FROM sessions WHERE token = ?");

export function createSession(address: string): string {
  const token = randomUUID();
  insertSession.run(token, address.toLowerCase(), Date.now() + SESSION_TTL_MS);
  return token;
}

/** Returns the session if the token is valid and hasn't expired; cleans it up if it has. */
export function getSession(token: string): Session | undefined {
  const row = selectSession.get(token) as Session | undefined;
  if (!row) return undefined;
  if (Date.now() > row.expiresAt) {
    deleteSession.run(token);
    return undefined;
  }
  return row;
}
