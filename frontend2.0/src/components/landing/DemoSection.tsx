import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/wagmi";
import { TxTrackerProvider } from "@/context/TxTrackerContext";
import { AppShell } from "@/components/dapp/AppShell";
import { Reveal } from "./Reveal";

// It used to live on its own route ("/app", routes/app.tsx). It was moved
// here so the functional dApp (with its real Hero/carousel) is part of the
// same page, instead of a separate destination. AppShell didn't change: same
// component, new location. WagmiProvider/TxTrackerProvider are only mounted
// in this section, same as they used to be mounted only in /app.
export function DemoSection() {
  return (
    <section
      id="demo"
      className="relative border-t"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto max-w-6xl px-6 pt-28 pb-14">
        <Reveal>
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)" }}
          >
            Live demo
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            Atlas, running right here.
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[color:var(--ink-muted)]">
            Connect your wallet on Base Sepolia or Ethereum Sepolia to create a
            campaign, pledge, claim funds, or request a refund — against the
            real deployed contract.
          </p>
        </Reveal>
      </div>

      <div className="dapp-scope">
        <WagmiProvider config={wagmiConfig}>
          <TxTrackerProvider>
            <AppShell />
          </TxTrackerProvider>
        </WagmiProvider>
      </div>
    </section>
  );
}

export default DemoSection;
