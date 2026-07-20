import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import {
  errorMessages,
  toReadableError,
  extractErrorName,
} from "@/lib/txErrors";
import type { ActionStatus } from "@/hooks/useTxStatus";

// Migrated 1:1 from frontend/src/context/TxTrackerContext.tsx
// (docs/08_FRONTEND_MIGRATION.md). Only change: imports via the "@/..." alias.

const STORAGE_KEY = "cf-tracked-txs";

export interface TrackedTx {
  hash: `0x${string}`;
  status: ActionStatus;
  errorMessage?: string;
}

interface TxTrackerValue {
  track: (hash: `0x${string}`) => void;
  getTx: (hash: `0x${string}` | undefined) => TrackedTx | undefined;
  txs: TrackedTx[];
  dismiss: (hash: `0x${string}`) => void;
}

const TxTrackerCtx = createContext<TxTrackerValue | null>(null);

/** Tracks a single hash as long as the provider (never this particular
 *  component) stays mounted. Independent of the view/form that originated the tx. */
function TxWatcher({
  hash,
  onResolve,
}: {
  hash: `0x${string}`;
  onResolve: (tx: TrackedTx) => void;
}) {
  const publicClient = usePublicClient();
  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receiptError) {
      // Resolved exactly ONCE (not in two passes): the provider only keeps
      // rendering this watcher while the hash's status is "confirming"/"pending",
      // so an early onResolve("error", genericMessage) would flip the status
      // and unmount this component before the eth_call replay below (a real
      // network round-trip) has a chance to finish — the decoded error name
      // would then never reach the user. Await the replay first, then resolve once.
      let cancelled = false;
      (async () => {
        // The mined receipt doesn't carry the revert reason (only status). The
        // same call is re-executed via eth_call, which does return the revert bytes.
        let errorMessage = toReadableError(receiptError);
        if (publicClient) {
          try {
            const tx = await publicClient.getTransaction({ hash });
            await publicClient.call({
              account: tx.from,
              to: tx.to ?? undefined,
              data: tx.input,
              value: tx.value,
            });
          } catch (callError) {
            const name = extractErrorName(callError);
            if (name && errorMessages[name]) errorMessage = errorMessages[name];
          }
        }
        if (!cancelled) onResolve({ hash, status: "error", errorMessage });
      })();
      return () => {
        cancelled = true;
      };
    }

    if (isSuccess) {
      onResolve({ hash, status: "success" });
    } else {
      onResolve({ hash, status: isConfirming ? "confirming" : "pending" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, isConfirming, isSuccess, receiptError, publicClient]);

  return null;
}

export function TxTrackerProvider({ children }: { children: ReactNode }) {
  const [txs, setTxs] = useState<Record<string, TrackedTx>>(() => {
    // Rehydrates only the PENDING hashes from a previous session (reload or
    // tab close). The result (success/error) is never trusted from
    // localStorage: it's queried from the chain again from scratch via TxWatcher.
    //
    // SSR guard (localStorage doesn't exist on TanStack Start's server): the
    // useState() with an initializer function runs both on the first server
    // render and the client one, so without this guard the SSR build broke.
    // `ssr: true` in wagmi.ts already assumes an "empty" initial state on
    // the server, this is consistent with that same strategy.
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const hashes: `0x${string}`[] = raw ? JSON.parse(raw) : [];
      return Object.fromEntries(
        hashes.map((h) => [
          h,
          { hash: h, status: "confirming" as ActionStatus },
        ]),
      );
    } catch {
      return {};
    }
  });

  const track = useCallback((hash: `0x${string}`) => {
    setTxs((prev) =>
      prev[hash] ? prev : { ...prev, [hash]: { hash, status: "confirming" } },
    );
  }, []);

  const handleResolve = useCallback((tx: TrackedTx) => {
    setTxs((prev) => ({ ...prev, [tx.hash]: tx }));
  }, []);

  const dismiss = useCallback((hash: `0x${string}`) => {
    setTxs((prev) => {
      const next = { ...prev };
      delete next[hash];
      return next;
    });
  }, []);

  // Persist only what's NOT resolved: an already confirmed/reverted tx
  // doesn't need to survive a reload, its final result was already shown to the user.
  useEffect(() => {
    const pending = Object.values(txs)
      .filter((t) => t.status !== "success" && t.status !== "error")
      .map((t) => t.hash);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    } catch {
      // localStorage not available (private mode, quota full, etc.): tracking
      // is lost between reloads, but nothing breaks in the current session.
    }
  }, [txs]);

  const getTx = useCallback(
    (hash: `0x${string}` | undefined) => (hash ? txs[hash] : undefined),
    [txs],
  );
  const txList = useMemo(() => Object.values(txs), [txs]);
  const value = useMemo(
    () => ({ track, getTx, txs: txList, dismiss }),
    [track, getTx, txList, dismiss],
  );

  const unresolvedHashes = txList
    .filter((t) => t.status === "confirming" || t.status === "pending")
    .map((t) => t.hash);

  return (
    <TxTrackerCtx.Provider value={value}>
      {children}
      {unresolvedHashes.map((hash) => (
        <TxWatcher key={hash} hash={hash} onResolve={handleResolve} />
      ))}
    </TxTrackerCtx.Provider>
  );
}

export function useTxTracker(): TxTrackerValue {
  const ctx = useContext(TxTrackerCtx);
  if (!ctx)
    throw new Error("useTxTracker must be used inside TxTrackerProvider");
  return ctx;
}
