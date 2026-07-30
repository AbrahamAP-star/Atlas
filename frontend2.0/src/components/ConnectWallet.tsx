import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { supportedChains } from "@/contracts/crowdfundingConfig";

// Migrated 1:1 from frontend/src/components/ConnectWallet.tsx (docs/08_FRONTEND_MIGRATION.md).
//
// wagmi v3 moved connectors/chains to their own hooks and turned connect/disconnect/
// switchChain into mutation objects (react-query): they're called with .mutate(), not
// as a direct function. See github.com/wevm/wagmi migrate-from-v2-to-v3.
export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const network = useNetworkStatus();

  if (!isConnected) {
    const injected =
      connectors.find((c) => c.type === "injected") ?? connectors[0];

    return (
      <div className="wallet-box">
        <button
          onClick={() => {
            if (injected) connect.mutate({ connector: injected });
          }}
          disabled={connect.isPending || !injected}
        >
          {connect.isPending ? "Connecting…" : "Connect wallet"}
        </button>
        <p className="network-hint">
          Read-only mode. Connect your wallet to pledge, create, or claim.
        </p>
        {connect.error && (
          // Surfaces mutation failures (e.g. wallet rejected, RPC unreachable)
          // instead of the button silently sitting there with no feedback.
          <p className="network-hint error">{connect.error.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="wallet-box">
      <select
        aria-label="Switch network"
        value={network.activeChainId}
        onChange={(e) =>
          switchChain.mutate({ chainId: Number(e.target.value) })
        }
      >
        {supportedChains.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
      <div>
        {address?.slice(0, 6)}…{address?.slice(-4)}{" "}
        <button className="secondary" onClick={() => disconnect.mutate()}>
          Disconnect
        </button>
      </div>
      {network.kind === "unsupported-chain" && (
        <p className="network-hint error">
          This network isn't supported. Switch to:{" "}
          {network.supportedChainNames.join(", ")}.
        </p>
      )}
      {network.kind === "not-deployed" && (
        <p className="network-hint error">
          The contract isn't deployed on this network. Switch to:{" "}
          {network.deployedChainNames.join(", ")}.
        </p>
      )}
    </div>
  );
}
