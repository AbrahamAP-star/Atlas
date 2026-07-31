import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import { verifyMessage, isAddress } from "viem";
import { fileURLToPath } from "node:url";
import { pinFileToIPFS, pinJSONToIPFS, unpinFromIPFS } from "./pinata.js";
import { issueNonce, peekNonce, consumeNonce, buildSignMessage } from "./nonceStore.js";
import { createSession } from "./sessionStore.js";
import { hasQuota, consumeQuota } from "./rateLimiter.js";
import { requireSession, requireAdminKey, type AuthenticatedRequest } from "./auth.js";
import { logUpload, logAdminAction } from "./auditLog.js";
import { SESSION_TTL_MS } from "./config.js";

const PORT = process.env.PORT ?? 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

if (!process.env.PINATA_JWT) {
  console.warn("[backend] PINATA_JWT not configured — IPFS uploads will fail.");
}

// Same limit/whitelist the frontend already validated, but real: the client
// can be bypassed, this is the only validation that actually counts.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["application/pdf", "text/plain", "image/png", "image/jpeg", "image/gif", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error("File type not allowed."));
      return;
    }
    cb(null, true);
  },
});

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "1mb" })); // JSON metadata only, never files

// --- Wallet authentication: single-use nonce + signature -> session token ---

app.post("/api/auth/nonce", (req: Request, res: Response) => {
  const address = req.body?.address as string | undefined;
  if (!address || !isAddress(address)) {
    res.status(400).json({ error: "Invalid wallet address." });
    return;
  }
  const { message } = issueNonce(address);
  res.json({ message });
});

app.post("/api/auth/verify", async (req: Request, res: Response) => {
  const address = req.body?.address as string | undefined;
  const signature = req.body?.signature as string | undefined;
  if (!address || !isAddress(address) || !signature) {
    res.status(400).json({ error: "Missing valid address or signature." });
    return;
  }

  // Point 11 of docs/09_ROADMAP_MEJORAS.md: quota checked by IP AND address
  // combined (see rateLimiter.ts) — checking only IP is trivially evaded by
  // rotating wallets, checking only address is trivially evaded by rotating
  // IP/VPN. Both together raise the real cost of abuse without extra UX friction.
  const ip = req.ip ?? "unknown";
  if (!hasQuota(ip, address)) {
    res.status(429).json({ error: "You already reached the upload limit for this time window. Try again shortly." });
    return;
  }

  const entry = peekNonce(address);
  if (!entry) {
    res.status(401).json({ error: "Invalid or expired nonce. Please try again." });
    return;
  }

  const message = buildSignMessage(entry.nonce);
  const valid = await verifyMessage({
    address: address as `0x${string}`,
    message,
    signature: signature as `0x${string}`,
  }).catch(() => false);

  // The nonce is always invalidated, whether the signature was valid or not: single-use.
  consumeNonce(address);

  if (!valid) {
    res.status(401).json({ error: "Invalid signature." });
    return;
  }

  consumeQuota(ip, address);
  const token = createSession(address);
  res.json({ token, expiresInMs: SESSION_TTL_MS });
});

// --- Pinata uploads: require a valid session token (see requireSession) ---

app.post("/api/pin-file", requireSession, upload.single("file"), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "Missing file." });
    return;
  }
  try {
    const cid = await pinFileToIPFS(req.file.buffer, req.file.originalname, req.file.mimetype);
    // Audit trail (point 11): no content moderation happens here (see
    // auditLog.ts), just a record of who uploaded what, for scripts/audit-uploads.ts
    // and for manual review if a CID is later reported.
    logUpload({ cid, address: req.walletAddress ?? "unknown", ip: req.ip ?? "unknown", kind: "file" });
    res.json({ cid });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Error uploading to IPFS." });
  }
});

app.post("/api/pin-json", requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cid = await pinJSONToIPFS(req.body);
    logUpload({ cid, address: req.walletAddress ?? "unknown", ip: req.ip ?? "unknown", kind: "json" });
    res.json({ cid });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Error uploading to IPFS." });
  }
});

// --- Emergency unpin (point 11 of docs/09_ROADMAP_MEJORAS.md) ---
// Protected by its own credential (ADMIN_UNPIN_KEY, see auth.ts), never by a
// wallet session. Every call is logged (success or failure) via logAdminAction
// so a misused/leaked key is traceable — this is the minimum governance
// mechanism the roadmap requires before exposing the backend outside localhost.
app.post("/api/admin/unpin", requireAdminKey, async (req: Request, res: Response) => {
  const cid = req.body?.cid as string | undefined;
  const ip = req.ip ?? "unknown";
  if (!cid) {
    res.status(400).json({ error: "Missing cid." });
    return;
  }
  try {
    await unpinFromIPFS(cid);
    logAdminAction("unpin", cid, ip);
    res.json({ success: true, cid });
  } catch (err) {
    logAdminAction("unpin_failed", `${cid}: ${err instanceof Error ? err.message : String(err)}`, ip);
    res.status(502).json({ error: err instanceof Error ? err.message : "Error unpinning from IPFS." });
  }
});

// Translates multer errors (rejected size/mime) into readable JSON instead
// of Express's default HTML error page.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: err.message });
});

export { app };

// Only bind a real port when run directly (`node index.js` / `tsx src/index.ts`).
// When imported by tests (supertest), this guard keeps `app` usable without
// occupying a port or racing other test files for it.
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`[backend] Pinata proxy listening on :${PORT}`);
  });
}
