import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// One local file, no external service to run — fits the "backend minimo"
// philosophy (00_PROJECT_OVERVIEW.md). Chosen over Redis (Opcion B del
// roadmap): the real volume here is 1 upload/IP/window, a shared/multi-instance
// store would be complexity with no current use, see 09_ROADMAP_MEJORAS.md § 5.
const DB_PATH = process.env.DB_PATH ?? fileURLToPath(new URL("../data/backend.sqlite", import.meta.url));
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL"); // safe for a single-process server, avoids blocking reads during a write

db.exec(`
  CREATE TABLE IF NOT EXISTS nonces (
    address TEXT PRIMARY KEY,
    nonce TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS quota_usage (
    ip TEXT PRIMARY KEY,
    window_key INTEGER NOT NULL,
    count INTEGER NOT NULL
  );
  -- Point 11 of 09_ROADMAP_MEJORAS.md: quota tracked by wallet address IN
  -- ADDITION to quota_usage (by IP), never instead of it. Kept as its own
  -- table (same shape as quota_usage) instead of adding an "address" column
  -- to quota_usage: that table's PRIMARY KEY is "ip", one row per IP — a
  -- bolted-on address column would either force a second index or silently
  -- allow two different wallets behind the same IP to share one counter.
  -- Two independent tables keep both dimensions genuinely independent, and
  -- checkAndConsumeQuota() in rateLimiter.ts is the only place that
  -- combines them, so the two-key logic lives in exactly one function.
  CREATE TABLE IF NOT EXISTS quota_usage_address (
    address TEXT PRIMARY KEY,
    window_key INTEGER NOT NULL,
    count INTEGER NOT NULL
  );
  -- Audit trail for point 11: every successful pin (file or json) gets one
  -- row here, so scripts/audit-uploads.ts can list "who uploaded what, when"
  -- for manual moderation. Unlike nonces/sessions this is NOT ephemeral on
  -- purpose (see cleanup note below) — it's the record moderation depends on.
  CREATE TABLE IF NOT EXISTS upload_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cid TEXT NOT NULL,
    address TEXT NOT NULL,
    ip TEXT NOT NULL,
    kind TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  -- Audit trail for the emergency /api/admin/unpin endpoint: every call,
  -- successful or not, so a leaked/misused ADMIN_UNPIN_KEY is traceable.
  CREATE TABLE IF NOT EXISTS admin_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    ip TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Expired nonces/sessions would otherwise sit in the file forever (nothing
// ever deletes them unless that exact address/token is looked up again).
// Sweeps every 5 min; .unref() so this timer alone never keeps the process alive.
// NOTE: quota_usage / quota_usage_address are NOT swept here on purpose —
// their rows are tiny (one per IP/address) and window_key already makes old
// rows harmless (see rateLimiter.ts), so there's no correctness reason to
// delete them early. upload_log / admin_actions are an audit trail: kept
// indefinitely by design (see comments at CREATE TABLE above), not swept.
setInterval(
  () => {
    const now = Date.now();
    db.prepare("DELETE FROM nonces WHERE expires_at < ?").run(now);
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  },
  5 * 60 * 1000,
).unref();
