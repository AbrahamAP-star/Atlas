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
