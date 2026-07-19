import { useEffect } from "react";
import { useTxTracker } from "@/context/TxTrackerContext";
import { toReadableError } from "@/lib/txErrors";

// Migrated 1:1 from frontend/src/hooks/useTxStatus.ts (docs/08_FRONTEND_MIGRATION.md).
// Only change: imports via the "@/..." alias.

export type ActionStatus = "idle" | "pending" | "confirming" | "success" | "error";

/** Thin adapter: registers the hash in the global TxTracker (which survives
 *  navigation/reload, see TxTrackerContext) and returns its current state.
 *  The only state resolved LOCALLY is `writeError` (wallet rejection or
 *  simulation failure): it happens before a hash exists, in the same render
 *  where writeContract was called, so there's no risk of losing it to navigation. */
export function useTxStatus(hash: `0x${string}` | undefined, writeError: unknown) {
  const { track, getTx } = useTxTracker();

  useEffect(() => {
    if (hash) track(hash);
  }, [hash, track]);

  if (writeError) {
    return { status: "error" as ActionStatus, errorMessage: toReadableError(writeError) };
  }

  const tracked = getTx(hash);
  if (!tracked) {
    return { status: (hash ? "confirming" : "idle") as ActionStatus, errorMessage: undefined };
  }
  return { status: tracked.status, errorMessage: tracked.errorMessage };
}
