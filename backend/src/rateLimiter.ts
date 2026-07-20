import { db } from "./db.js";
import { MAX_UPLOADS_PER_IP_PER_WINDOW, UPLOAD_QUOTA_WINDOW_MS } from "./config.js";

// Same public API and fixed-time-bucket logic as before, now backed by
// SQLite instead of a Map — see nonceStore.ts for why.

interface UsageRow {
  windowKey: number;
  count: number;
}

const selectUsage = db.prepare("SELECT window_key AS windowKey, count FROM quota_usage WHERE ip = ?");
// Same window -> increment; new window -> reset to 1. "window_key" (unqualified)
// in the CASE refers to the row's value BEFORE this upsert, "excluded.window_key"
// to the new value being inserted — standard SQLite upsert semantics.
const upsertUsage = db.prepare(`
  INSERT INTO quota_usage (ip, window_key, count) VALUES (?, ?, 1)
  ON CONFLICT(ip) DO UPDATE SET
    count = CASE WHEN window_key = excluded.window_key THEN count + 1 ELSE 1 END,
    window_key = excluded.window_key
`);

function currentWindowKey(): number {
  return Math.floor(Date.now() / UPLOAD_QUOTA_WINDOW_MS);
}

/** true if the IP still has quota left in the current window. Doesn't consume the quota. */
export function hasQuota(ip: string): boolean {
  const row = selectUsage.get(ip) as UsageRow | undefined;
  if (!row || row.windowKey !== currentWindowKey()) return true;
  return row.count < MAX_UPLOADS_PER_IP_PER_WINDOW;
}

/** Consumes one quota unit from the current window for the IP. */
export function consumeQuota(ip: string): void {
  upsertUsage.run(ip, currentWindowKey());
}
