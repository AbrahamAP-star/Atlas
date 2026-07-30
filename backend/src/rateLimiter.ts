import { db } from "./db.js";
import { MAX_UPLOADS_PER_IP_PER_WINDOW, UPLOAD_QUOTA_WINDOW_MS } from "./config.js";

// Point 11 of docs/09_ROADMAP_MEJORAS.md (Opcion A): rate limit combinado
// IP + wallet address, no solo IP como antes. Motivo: generar una wallet
// nueva es gratis, asi que limitar solo por address no sube el costo real
// de abuso; limitar solo por IP se evade con VPN. Combinando ambos, un
// atacante necesita rotar AMBAS cosas para cada intento adicional, lo cual
// sigue siendo evadible pero ya no es gratis/instantaneo.
//
// Misma logica de "fixed window" que ya existia (window_key = bucket de
// tiempo), duplicada sobre dos tablas independientes — ver el comentario
// en db.ts sobre por que son dos tablas separadas y no una columna extra.

interface UsageRow {
  windowKey: number;
  count: number;
}

const selectUsageByIp = db.prepare("SELECT window_key AS windowKey, count FROM quota_usage WHERE ip = ?");
const upsertUsageByIp = db.prepare(`
  INSERT INTO quota_usage (ip, window_key, count) VALUES (?, ?, 1)
  ON CONFLICT(ip) DO UPDATE SET
    count = CASE WHEN window_key = excluded.window_key THEN count + 1 ELSE 1 END,
    window_key = excluded.window_key
`);

const selectUsageByAddress = db.prepare(
  "SELECT window_key AS windowKey, count FROM quota_usage_address WHERE address = ?",
);
const upsertUsageByAddress = db.prepare(`
  INSERT INTO quota_usage_address (address, window_key, count) VALUES (?, ?, 1)
  ON CONFLICT(address) DO UPDATE SET
    count = CASE WHEN window_key = excluded.window_key THEN count + 1 ELSE 1 END,
    window_key = excluded.window_key
`);

function currentWindowKey(): number {
  return Math.floor(Date.now() / UPLOAD_QUOTA_WINDOW_MS);
}

function hasQuotaInTable(row: UsageRow | undefined): boolean {
  if (!row || row.windowKey !== currentWindowKey()) return true;
  return row.count < MAX_UPLOADS_PER_IP_PER_WINDOW;
}

/**
 * true only if BOTH the IP and the address still have quota left in the
 * current window. Doesn't consume anything — call consumeQuota() after the
 * action you're gating (e.g. after the signature verifies) succeeds.
 */
export function hasQuota(ip: string, address: string): boolean {
  const ipRow = selectUsageByIp.get(ip) as UsageRow | undefined;
  const addressRow = selectUsageByAddress.get(address.toLowerCase()) as UsageRow | undefined;
  return hasQuotaInTable(ipRow) && hasQuotaInTable(addressRow);
}

/** Consumes one quota unit from the current window for BOTH the IP and the address. */
export function consumeQuota(ip: string, address: string): void {
  const windowKey = currentWindowKey();
  upsertUsageByIp.run(ip, windowKey);
  upsertUsageByAddress.run(address.toLowerCase(), windowKey);
}
