import { ShieldCheck, LockKeyhole, Ruler, Radio, Trash2 } from "lucide-react";
import { Reveal } from "./Reveal";

const items = [
  {
    icon: ShieldCheck,
    title: "Two-layer reentrancy protection",
    body: "Checks-effects-interactions pattern plus a transient guard on every fund-moving function. It's the defense against the most common attack on contracts holding money.",
  },
  {
    icon: LockKeyhole,
    title: "No admin, no rug pull possible by design",
    body: "There's no function that pauses, freezes, or redirects withdrawals. Not even the author can touch another user's funds.",
  },
  {
    icon: Ruler,
    title: "Amounts with safe conversions",
    body: "Numeric types sized to the real range (uint96) and SafeCast on every conversion: no value is ever truncated silently.",
  },
  {
    icon: Radio,
    title: "Typed errors and events on every action",
    body: "Custom errors instead of raw reverts, and on-chain events for full traceability from any indexer.",
  },
  {
    icon: Trash2,
    title: "Protected project deletion",
    body: "A creator can only delete their campaign if there are no third-party funds at risk — never at a backer's expense.",
  },
];

export function SecuritySection() {
  return (
    <section
      id="seguridad"
      className="relative border-t"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-28">
        <Reveal>
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)" }}
          >
            Security
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
            Design decisions a non-technical client can understand too.
          </h2>
        </Reveal>

        <ul className="mt-14 grid gap-4 md:grid-cols-2">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 70} as="li">
              <div
                className="flex h-full gap-4 rounded-2xl border p-6 card-hover hover:card-hover-lift"
                style={{
                  background: "var(--panel)",
                  borderColor: "var(--hairline)",
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "oklch(0.82 0.15 78 / 0.12)",
                    color: "var(--accent)",
                  }}
                >
                  <it.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                    {it.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
