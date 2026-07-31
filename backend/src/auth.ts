import type { NextFunction, Request, Response } from "express";
import { getSession } from "./sessionStore.js";

export interface AuthenticatedRequest extends Request {
  walletAddress?: string;
}

export function requireSession(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const session = token ? getSession(token) : undefined;

  if (!session) {
    res.status(401).json({ error: "Invalid or expired session. Connect your wallet and sign again." });
    return;
  }

  req.walletAddress = session.address;
  next();
}

/**
 * Point 11 of docs/09_ROADMAP_MEJORAS.md: guards the emergency unpin
 * endpoint with its own credential (ADMIN_UNPIN_KEY), separate from
 * PINATA_JWT and from any wallet-session token — a leaked session token
 * (15 min TTL, scoped to uploading) must never be enough to unpin content.
 * Constant-time comparison isn't used here on purpose: this key is checked
 * rarely (an admin action, not a hot path like session lookup), and the
 * realistic threat here is a leaked/guessed key, not a timing side-channel
 * against a locally-run backend.
 */
export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_UNPIN_KEY;
  if (!expected) {
    res.status(500).json({ error: "ADMIN_UNPIN_KEY not configured on the server." });
    return;
  }

  const provided = req.headers["x-admin-key"];
  if (provided !== expected) {
    res.status(401).json({ error: "Invalid admin key." });
    return;
  }

  next();
}
