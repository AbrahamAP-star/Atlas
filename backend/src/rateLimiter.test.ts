import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point 11 of docs/09_ROADMAP_MEJORAS.md: quota must block if EITHER the IP
// or the wallet address ran out — rotating only one of the two must not be
// enough to bypass the limit. See rateLimiter.ts for the full rationale.

let tmpDir: string;
let hasQuota: typeof import("./rateLimiter.js").hasQuota;
let consumeQuota: typeof import("./rateLimiter.js").consumeQuota;

beforeAll(async () => {
  // db.ts reads DB_PATH once at import time, so it must be set BEFORE the
  // dynamic import below — a fresh SQLite file per test file, never the real one.
  tmpDir = mkdtempSync(join(tmpdir(), "backend-ratelimiter-"));
  process.env.DB_PATH = join(tmpDir, "test.sqlite");
  ({ hasQuota, consumeQuota } = await import("./rateLimiter.js"));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("hasQuota / consumeQuota", () => {
  it("allows a fresh ip+address pair", () => {
    expect(hasQuota("1.1.1.1", "0xAAA")).toBe(true);
  });

  it("blocks the same ip even with a different address (MAX=1 in dev config)", () => {
    consumeQuota("2.2.2.2", "0xBBB");
    expect(hasQuota("2.2.2.2", "0xCCC")).toBe(false);
  });

  it("blocks the same address even with a different ip", () => {
    consumeQuota("3.3.3.3", "0xDDD");
    expect(hasQuota("4.4.4.4", "0xDDD")).toBe(false);
  });

  it("address matching is case-insensitive", () => {
    consumeQuota("5.5.5.5", "0xAbCdEf");
    expect(hasQuota("6.6.6.6", "0xABCDEF")).toBe(false);
  });

  it("allows again once a new time window starts", async () => {
    vi.useFakeTimers();
    consumeQuota("7.7.7.7", "0xEEE");
    expect(hasQuota("7.7.7.7", "0xEEE")).toBe(false);

    const { UPLOAD_QUOTA_WINDOW_MS } = await import("./config.js");
    vi.advanceTimersByTime(UPLOAD_QUOTA_WINDOW_MS + 1);
    expect(hasQuota("7.7.7.7", "0xEEE")).toBe(true);
    vi.useRealTimers();
  });
});
