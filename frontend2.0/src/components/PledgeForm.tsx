import { useEffect, useState } from "react";
import { parseEther } from "viem";
import type { Address } from "viem";
import { usePledge } from "@/hooks/usePledge";
import { TransactionStatus } from "./TransactionStatus";

// Migrated 1:1 from frontend/src/components/PledgeForm.tsx (docs/08_FRONTEND_MIGRATION.md).

interface Props {
  id: number;
  address: Address | undefined;
  disabled: boolean;
  onConfirmed: () => void;
}

export function PledgeForm({ id, address, disabled, onConfirmed }: Props) {
  const [amount, setAmount] = useState("");
  const { pledge, status, errorMessage, hash } = usePledge(address);

  // Refreshes the project's data once the transaction is confirmed on-chain.
  useEffect(() => {
    if (status === "success") onConfirmed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    pledge(id, parseEther(amount));
  }

  return (
    <form className="pledge-form" onSubmit={handleSubmit}>
      <input
        type="number"
        step="0.0001"
        min="0"
        placeholder="Amount in ETH"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={disabled}
        required
      />
      <button type="submit" disabled={disabled || status === "pending" || status === "confirming"}>
        Pledge
      </button>
      <TransactionStatus status={status} errorMessage={errorMessage} hash={hash} />
    </form>
  );
}
