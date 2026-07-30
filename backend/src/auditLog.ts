import { db } from "./db.js";

// Point 11 of docs/09_ROADMAP_MEJORAS.md: the backend didn't validate
// upload *content*, and had no record of who uploaded what. This module
// doesn't add content moderation (no cheap way to do that reliably without
// a third-party scanning service, out of scope for a "backend minimo") —
// it adds the audit trail that scripts/audit-uploads.ts and the emergency
// unpin endpoint depend on, so Abraham can react to a report manually.

export interface UploadLogEntry {
  cid: string;
  address: string;
  ip: string;
  kind: "file" | "json";
  createdAt: number;
}

const insertUpload = db.prepare(
  "INSERT INTO upload_log (cid, address, ip, kind, created_at) VALUES (?, ?, ?, ?, ?)",
);

/** Records a successful pin (file or json) for later manual review. */
export function logUpload(entry: Omit<UploadLogEntry, "createdAt">): void {
  insertUpload.run(entry.cid, entry.address.toLowerCase(), entry.ip, entry.kind, Date.now());
}

const selectUploadsSince = db.prepare(
  "SELECT cid, address, ip, kind, created_at AS createdAt FROM upload_log WHERE created_at >= ? ORDER BY created_at DESC",
);

/** Uploads logged since `sinceMs` ago (used by scripts/audit-uploads.ts). */
export function listUploadsSince(sinceMs: number): UploadLogEntry[] {
  return selectUploadsSince.all(Date.now() - sinceMs) as UploadLogEntry[];
}

const insertAdminAction = db.prepare(
  "INSERT INTO admin_actions (action, detail, ip, created_at) VALUES (?, ?, ?, ?)",
);

/** Records every call to an admin-protected endpoint, success or failure — the key itself has no other audit trail. */
export function logAdminAction(action: string, detail: string, ip: string): void {
  insertAdminAction.run(action, detail, ip, Date.now());
}
