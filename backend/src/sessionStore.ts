import { randomUUID } from "node:crypto";
import { SESSION_TTL_MS } from "./config.js";

interface Session {
  address: string;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

export function createSession(address: string): string {
  const token = randomUUID();
  sessions.set(token, { address: address.toLowerCase(), expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

/** Returns the session if the token is valid and hasn't expired; cleans it up if it has. */
export function getSession(token: string): Session | undefined {
  const session = sessions.get(token);
  if (!session) return undefined;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return undefined;
  }
  return session;
}
