import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";

// Point 11 of docs/09_ROADMAP_MEJORAS.md: the unpin endpoint must be guarded
// by ADMIN_UNPIN_KEY only — never by a wallet session token (see auth.ts).
const unpinFromIPFS = vi.fn();
vi.mock("./pinata.js", () => ({
  pinFileToIPFS: vi.fn(),
  pinJSONToIPFS: vi.fn(),
  unpinFromIPFS,
}));

let tmpDir: string;
let app: typeof import("./index.js").app;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "backend-admin-"));
  process.env.DB_PATH = join(tmpDir, "test.sqlite");
  process.env.ADMIN_UNPIN_KEY = "test-admin-key";
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";
  // process.argv[1] here is vitest's own entrypoint, never index.ts's path,
  // so index.ts's isMainModule guard stays false and app.listen() never runs.
  ({ app } = await import("./index.js"));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("POST /api/admin/unpin", () => {
  it("rejects without X-Admin-Key", async () => {
    const res = await request(app).post("/api/admin/unpin").send({ cid: "Qm123" });
    expect(res.status).toBe(401);
  });

  it("rejects with an incorrect X-Admin-Key", async () => {
    const res = await request(app)
      .post("/api/admin/unpin")
      .set("X-Admin-Key", "wrong-key")
      .send({ cid: "Qm123" });
    expect(res.status).toBe(401);
  });

  it("unpins and returns 200 with the correct X-Admin-Key", async () => {
    unpinFromIPFS.mockResolvedValueOnce(undefined);
    const res = await request(app)
      .post("/api/admin/unpin")
      .set("X-Admin-Key", "test-admin-key")
      .send({ cid: "Qm123" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, cid: "Qm123" });
    expect(unpinFromIPFS).toHaveBeenCalledWith("Qm123");
  });

  it("returns 400 when cid is missing, even with a valid key", async () => {
    const res = await request(app).post("/api/admin/unpin").set("X-Admin-Key", "test-admin-key").send({});
    expect(res.status).toBe(400);
  });

  it("returns 502 when Pinata's unpin call fails", async () => {
    unpinFromIPFS.mockRejectedValueOnce(new Error("Pinata unpin failed (500)."));
    const res = await request(app)
      .post("/api/admin/unpin")
      .set("X-Admin-Key", "test-admin-key")
      .send({ cid: "QmBroken" });
    expect(res.status).toBe(502);
  });
});
