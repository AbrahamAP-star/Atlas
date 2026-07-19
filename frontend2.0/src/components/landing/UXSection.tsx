import { Reveal } from "./Reveal";
import { Check } from "lucide-react";

const points = [
  "Readable transaction states (pending / confirming / success / error) — never a raw Solidity revert.",
  "Detects unsupported networks or an undeployed contract, with clear instructions on which network to use.",
  "Truly mobile-adapted layout: buttons with a comfortable tap area, stacked forms instead of squeezed ones.",
  "IPFS metadata (image, title, description, attached document) rendered inside the app — not raw JSON.",
];

export function UXSection() {
  return (
    <section id="ux" className="relative border-t" style={{ borderColor: "var(--hairline)" }}>
      <div className="mx-auto grid max-w-6xl gap-14 px-6 py-28 md:grid-cols-2 md:items-center">
        <div>
          <Reveal>
            <p
              className="text-xs uppercase tracking-[0.2em]"
              style={{ color: "var(--accent)" }}
            >
              User experience
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              On-chain complexity shouldn't reach the end user.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <ul className="mt-8 space-y-4">
              {points.map((p) => (
                <li key={p} className="flex gap-3">
                  <span
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "oklch(0.82 0.15 78 / 0.15)",
                      color: "var(--accent)",
                    }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-[color:var(--ink-muted)]">
                    {p}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={200}>
          {/* Abstract mockup of the real UI — no stock images */}
          <div
            className="relative overflow-hidden rounded-2xl border"
            style={{
              background: "var(--panel)",
              borderColor: "var(--hairline)",
              boxShadow: "var(--shadow-floating)",
            }}
          >
            <div
              className="flex items-center gap-2 border-b px-4 py-3"
              style={{ borderColor: "var(--hairline)" }}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--ink-dim)]/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--ink-dim)]/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--ink-dim)]/60" />
              <span className="ml-3 font-mono text-xs text-[color:var(--ink-dim)]">
                app.crowdfunding-dapp
              </span>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[color:var(--ink-dim)]">
                    Project #42
                  </p>
                  <p className="mt-1 text-lg font-semibold">Prototype manufacturing</p>
                </div>
                <span
                  className="rounded-full border px-2.5 py-1 font-mono text-[10px]"
                  style={{
                    borderColor: "oklch(0.82 0.15 78 / 0.4)",
                    color: "var(--accent)",
                  }}
                >
                  confirming · 2/3
                </span>
              </div>

              <div className="mt-6">
                <div className="flex items-baseline justify-between font-mono text-xs text-[color:var(--ink-muted)]">
                  <span>3.42 / 5.00 ETH</span>
                  <span>68%</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full"
                  style={{ background: "oklch(0.25 0.016 55)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "68%",
                      background:
                        "linear-gradient(90deg, var(--accent), var(--accent-strong))",
                      boxShadow: "0 0 12px oklch(0.82 0.15 78 / 0.6)",
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-xs">
                <div
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--ink-dim)]">
                    Est. gas
                  </p>
                  <p className="mt-1 text-sm">118,244</p>
                </div>
                <div
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <p className="text-[10px] uppercase tracking-widest text-[color:var(--ink-dim)]">
                    Network
                  </p>
                  <p className="mt-1 text-sm">Base Sepolia</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
