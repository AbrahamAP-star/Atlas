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
`);

// Expired nonces/sessions would otherwise sit in the file forever (nothing
// ever deletes them unless that exact address/token is looked up again).
// Sweeps every 5 min; .unref() so this timer alone never keeps the process alive.
setInterval(
  () => {
    const now = Date.now();
    db.prepare("DELETE FROM nonces WHERE expires_at < ?").run(now);
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  },
  5 * 60 * 1000,
).unref();
