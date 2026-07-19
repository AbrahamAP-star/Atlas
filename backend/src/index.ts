import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import { verifyMessage, isAddress } from "viem";
import { pinFileToIPFS, pinJSONToIPFS } from "./pinata.js";
import { issueNonce, peekNonce, consumeNonce, buildSignMessage } from "./nonceStore.js";
import { createSession } from "./sessionStore.js";
import { hasQuota, consumeQuota } from "./rateLimiter.js";
import { requireSession, type AuthenticatedRequest } from "./auth.js";
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

  const ip = req.ip ?? "unknown";
  if (!hasQuota(ip)) {
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

  consumeQuota(ip);
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
    res.json({ cid });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Error uploading to IPFS." });
  }
});

app.post("/api/pin-json", requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cid = await pinJSONToIPFS(req.body);
    res.json({ cid });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Error uploading to IPFS." });
  }
});

// Translates multer errors (rejected size/mime) into readable JSON instead
// of Express's default HTML error page.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[backend] Pinata proxy listening on :${PORT}`);
});
