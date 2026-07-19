import { useState } from "react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { ProjectList } from "@/components/ProjectList";
import { ProjectDetail } from "@/components/ProjectDetail";
import { CreateProjectForm } from "@/components/CreateProjectForm";
import { Hero } from "./Hero";
import { GlobalTxToasts } from "@/components/GlobalTxToasts";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { playBackSound, playNavigateSound } from "@/lib/sounds";

// Migrated 1:1 from frontend/src/App.tsx (docs/08_FRONTEND_MIGRATION.md).
// Only real change: the component was renamed from "App" to "AppShell" (the
// name "App" no longer applies in TanStack Start, where the mount point is
// a route file) and the imported Hero is the one in components/dapp/Hero.tsx
// (marquee + Explore/Create), not the portfolio Hero in components/landing.
// Mounted from src/routes/app.tsx, wrapped in WagmiProvider + TxTrackerProvider.

type View = { name: "home" } | { name: "list" } | { name: "detail"; id: number } | { name: "create" };

export function AppShell() {
  const [view, setView] = useState<View>({ name: "home" });
  const network = useNetworkStatus();

  // The Hero ("home") takes up the full viewport width (Hero spec); the
  // rest of the views keep the 880px centered container already in place
  // since Phase 4 - that's why .app-shell only wraps those views.
  return (
    <>
      <header className="app-header">
        <h1
          className="brand-link"
          onClick={() => {
            playBackSound();
            setView({ name: "home" });
          }}
        >
          Crowdfunding DApp
        </h1>
        <ConnectWallet />
      </header>

      {view.name === "home" ? (
        <Hero
          onExplore={() => {
            playNavigateSound();
            setView({ name: "list" });
          }}
          onCreate={() => {
            if (!network.canInteract) return;
            playNavigateSound();
            setView({ name: "create" });
          }}
          canCreate={network.canInteract}
        />
      ) : (
        <div className="app-shell">
          {/* Read-only without a wallet: you can navigate, not interact. */}
          {network.kind === "disconnected" && (
            <p className="network-hint">Please connect your wallet to create, pledge, claim, or request a refund.</p>
          )}

          {/* key=view.name resets the entry animation (.view-fade in
              styles.css) on every view change, without relying on the View
              Transitions API (not supported in every browser). */}
          <div key={view.name} className="view-fade">
          {view.name === "list" && (
            <>
              <div className="view-toolbar">
                <button
                  className="secondary"
                  onClick={() => {
                    playBackSound();
                    setView({ name: "home" });
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    playNavigateSound();
                    setView({ name: "create" });
                  }}
                  disabled={!network.canInteract}
                >
                  + New project
                </button>
              </div>
              <ProjectList
                onSelect={(id) => {
                  playNavigateSound();
                  setView({ name: "detail", id });
                }}
              />
            </>
          )}
          {view.name === "detail" && <ProjectDetail id={view.id} onBack={() => setView({ name: "list" })} />}
          {view.name === "create" && (
            <CreateProjectForm onCreated={() => setView({ name: "list" })} onCancel={() => setView({ name: "list" })} />
          )}
          </div>
        </div>
      )}
      {/* Outside the view switch on purpose: a tx stays visible even if the
          user navigates away from the form that originated it. */}
      <GlobalTxToasts />
    </>
  );
}
