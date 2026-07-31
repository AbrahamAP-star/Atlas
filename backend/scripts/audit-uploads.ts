/**
 * Point 11 of docs/09_ROADMAP_MEJORAS.md.
 *
 * Lists every upload (image/document/metadata) logged in the last 24h
 * (or a custom window via --hours=N) for manual review by Abraham. This is
 * NOT automatic content moderation — there is no reliable cheap way to scan
 * file content without a third-party service, which would contradict the
 * "backend minimo" philosophy (00_PROJECT_OVERVIEW.md). This is the
 * reactive half: fast enough visibility to catch abuse and unpin it via
 * POST /api/admin/unpin if something reported/suspicious shows up.
 *
 * Lives in backend/scripts/ (not the repo-root scripts/) on purpose: it
 * reads backend/data/backend.sqlite directly via backend's own db.ts, so it
 * needs backend's dependencies (better-sqlite3) — putting it at the repo
 * root would mean adding a SQLite dependency to the Hardhat/contracts
 * package for no reason.
 *
 * Usage:
 *   cd backend
 *   npm run audit:uploads              # last 24h
 *   npm run audit:uploads -- --hours=72
 */
import { listUploadsSince } from "../src/auditLog.js";
import { fileURLToPath } from "node:url";

export function parseHoursArg(argv: string[]): number {
  const arg = argv.find((a) => a.startsWith("--hours="));
  if (!arg) return 24;
  const value = Number(arg.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? value : 24;
}

export function formatRow(entry: { cid: string; address: string; ip: string; kind: string; createdAt: number }): string {
  const when = new Date(entry.createdAt).toISOString();
  return `${when}  ${entry.kind.padEnd(4)}  ${entry.address}  ip=${entry.ip}  cid=${entry.cid}`;
}

function main(): void {
  const hours = parseHoursArg(process.argv.slice(2));
  const entries = listUploadsSince(hours * 60 * 60 * 1000);

  console.log(`Uploads in the last ${hours}h: ${entries.length}\n`);

  if (entries.length === 0) {
    console.log("Nothing to review.");
    return;
  }

  for (const entry of entries) {
    console.log(formatRow(entry));
  }

  console.log(
    `\nTo unpin a reported CID:\n` +
      `  curl -X POST http://localhost:3001/api/admin/unpin \\\n` +
      `    -H "X-Admin-Key: $ADMIN_UNPIN_KEY" -H "Content-Type: application/json" \\\n` +
      `    -d '{"cid":"<CID>"}'`,
  );
}

// Only run when executed directly (`tsx scripts/audit-uploads.ts`) — importing
// this file from a test must not print to stdout or touch the real DB.
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
