import { useAccount } from "wagmi";
import { getExplorerTxUrl } from "@/contracts/crowdfundingConfig";
import type { ActionStatus } from "@/hooks/useTxStatus";

// Migrated 1:1 from frontend/src/components/TransactionStatus.tsx (docs/08_FRONTEND_MIGRATION.md).

interface Props {
  status: ActionStatus;
  errorMessage?: string;
  hash?: `0x${string}`;
}

/** Banner with readable messages about a transaction's status, for non-technical users. */
export function TransactionStatus({ status, errorMessage, hash }: Props) {
  const { chainId } = useAccount();
  if (status === "idle") return null;

  if (status === "error") {
    return <p className="tx-banner error">{errorMessage ?? "An error occurred."}</p>;
  }
  if (status === "success") {
    return <p className="tx-banner success">Confirmed on the blockchain.</p>;
  }

  const explorerUrl = hash && chainId ? getExplorerTxUrl(chainId, hash) : undefined;
  return (
    <p className="tx-banner pending">
      {status === "confirming" ? "Confirming on the blockchain…" : "Waiting for your wallet to confirm…"}
      {explorerUrl && (
        <>
          {" "}
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            view transaction
          </a>
        </>
      )}
    </p>
  );
}
