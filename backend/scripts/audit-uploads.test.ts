import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tmpDir: string;
let parseHoursArg: typeof import("./audit-uploads.js").parseHoursArg;
let formatRow: typeof import("./audit-uploads.js").formatRow;
let logUpload: typeof import("../src/auditLog.js").logUpload;
let listUploadsSince: typeof import("../src/auditLog.js").listUploadsSince;
let db: typeof import("../src/db.js").db;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "backend-audit-"));
  process.env.DB_PATH = join(tmpDir, "test.sqlite");
  // process.argv[1] here is vitest's entrypoint, not this script's path,
  // so audit-uploads.ts's isMainModule guard stays false and main() never runs.
  ({ parseHoursArg, formatRow } = await import("./audit-uploads.js"));
  ({ logUpload, listUploadsSince } = await import("../src/auditLog.js"));
  ({ db } = await import("../src/db.js"));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("parseHoursArg", () => {
  it("defaults to 24 with no --hours flag", () => {
    expect(parseHoursArg([])).toBe(24);
  });

  it("reads a custom --hours value", () => {
    expect(parseHoursArg(["--hours=72"])).toBe(72);
  });

  it("falls back to 24 for a non-numeric or non-positive value", () => {
    expect(parseHoursArg(["--hours=abc"])).toBe(24);
    expect(parseHoursArg(["--hours=-5"])).toBe(24);
  });
});

describe("formatRow", () => {
  it("includes kind, address, ip and cid in a single readable line", () => {
    const line = formatRow({ cid: "QmABC", address: "0xDEF", ip: "1.2.3.4", kind: "file", createdAt: 0 });
    expect(line).toContain("file");
    expect(line).toContain("0xDEF");
    expect(line).toContain("ip=1.2.3.4");
    expect(line).toContain("cid=QmABC");
  });
});

describe("audit trail against a seeded SQLite db", () => {
  it("lists only uploads within the requested window, excluding older ones", () => {
    const oneHourMs = 60 * 60 * 1000;

    // Recent upload via the real logUpload() (stamps "now").
    logUpload({ cid: "QmRecent", address: "0x111", ip: "1.1.1.1", kind: "file" });

    // Stale upload inserted directly (logUpload always stamps "now", so a raw
    // insert is the only way to simulate a row from 48h ago).
    db.prepare("INSERT INTO upload_log (cid, address, ip, kind, created_at) VALUES (?, ?, ?, ?, ?)").run(
      "QmOld",
      "0x222",
      "2.2.2.2",
      "json",
      Date.now() - 48 * oneHourMs,
    );

    const entriesLast24h = listUploadsSince(24 * oneHourMs);
    expect(entriesLast24h.some((e) => e.cid === "QmRecent")).toBe(true);
    expect(entriesLast24h.some((e) => e.cid === "QmOld")).toBe(false);
  });
});
