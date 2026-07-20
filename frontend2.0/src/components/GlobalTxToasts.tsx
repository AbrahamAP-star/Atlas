import { useAccount } from "wagmi";
import { useTxTracker } from "@/context/TxTrackerContext";
import { getExplorerTxUrl } from "@/contracts/crowdfundingConfig";

// Migrated 1:1 from frontend/src/components/GlobalTxToasts.tsx (docs/08_FRONTEND_MIGRATION.md).

const LABELS: Record<string, string> = {
  confirming: "Confirming on the blockchain…",
  pending: "Waiting for your wallet to confirm…",
  success: "Confirmed on the blockchain.",
  error: "The transaction failed.",
};

/** Mounted once in the dApp shell, outside the view switch: that's why it
 *  keeps showing a tx's result even after the user has navigated away from
 *  the form that triggered it (see TxTrackerContext.tsx). */
export function GlobalTxToasts() {
  const { txs, dismiss } = useTxTracker();
  const { chainId } = useAccount();
  const visible = txs.filter((t) => t.status !== "idle");
  if (visible.length === 0) return null;

  return (
    <div className="tx-toast-stack">
      {visible.map((tx) => {
        const explorerUrl = chainId
          ? getExplorerTxUrl(chainId, tx.hash)
          : undefined;
        return (
          <div key={tx.hash} className={`tx-toast tx-toast--${tx.status}`}>
            <span>
              {tx.status === "error" && tx.errorMessage
                ? tx.errorMessage
                : LABELS[tx.status]}
            </span>
            {explorerUrl && (
              <a href={explorerUrl} target="_blank" rel="noreferrer">
                view tx
              </a>
            )}
            {(tx.status === "success" || tx.status === "error") && (
              <button
                type="button"
                className="secondary"
                onClick={() => dismiss(tx.hash)}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
