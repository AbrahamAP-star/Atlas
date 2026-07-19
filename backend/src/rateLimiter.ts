import { MAX_UPLOADS_PER_IP_PER_WINDOW, UPLOAD_QUOTA_WINDOW_MS } from "./config.js";

interface UsageEntry {
  windowKey: number;
  count: number;
}

const usageByIp = new Map<string, UsageEntry>();

// Fixed time bucket (not a sliding counter): groups time into blocks of
// UPLOAD_QUOTA_WINDOW_MS. Same approach as before (calendar day), just that
// the window is now configurable instead of fixed to the UTC day.
function currentWindowKey(): number {
  return Math.floor(Date.now() / UPLOAD_QUOTA_WINDOW_MS);
}

/** true if the IP still has quota left in the current window. Doesn't consume the quota. */
export function hasQuota(ip: string): boolean {
  const entry = usageByIp.get(ip);
  if (!entry || entry.windowKey !== currentWindowKey()) return true;
  return entry.count < MAX_UPLOADS_PER_IP_PER_WINDOW;
}

/** Consumes one quota unit from the current window for the IP. */
export function consumeQuota(ip: string): void {
  const windowKey = currentWindowKey();
  const entry = usageByIp.get(ip);
  if (!entry || entry.windowKey !== windowKey) {
    usageByIp.set(ip, { windowKey, count: 1 });
    return;
  }
  entry.count += 1;
}
