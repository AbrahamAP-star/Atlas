import { Reveal } from "./Reveal";
import { useCountUp } from "./hooks";

type Metric = {
  value: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  label: string;
  business: string;
  highlight?: boolean;
};

const metrics: Metric[] = [
  {
    value: 350_000,
    prefix: "< ",
    format: (n) => n.toLocaleString("en-US"),
    label: "max. gas to create a project",
    business: "Automatically verified in every test — not a promise.",
  },
  {
    value: 120_000,
    prefix: "< ",
    format: (n) => n.toLocaleString("en-US"),
    label: "max. gas per pledge",
    business: "Less gas = less cost for your end users.",
    highlight: true,
  },
  {
    value: 17,
    suffix: " / 17",
    label: "unit tests in Phase 1",
    business: "Plus reentrancy suites, amount fuzzing, and deletion tests.",
  },
  {
    value: 0,
    label: "critical vulnerabilities (Slither)",
    business:
      "19 findings → 0 exploitable. Expected noise from standard libraries.",
  },
  {
    value: 5000,
    prefix: "~",
    format: (n) => n.toLocaleString("en-US"),
    label: "gas saved per call",
    business: "ReentrancyGuardTransient (EIP-1153) vs. classic guard.",
  },
  {
    value: 0,
    label: "functions that can lock funds",
    business: "There's always an exit path: refund or claim.",
    highlight: true,
  },
];

function MetricCard({ m, delay }: { m: Metric; delay: number }) {
  const { ref, value } = useCountUp(m.value);
  const display = m.format ? m.format(value) : String(value);
  return (
    <Reveal delay={delay}>
      <div
        className="group relative flex h-full flex-col rounded-2xl border p-7 card-hover hover:card-hover-lift"
        style={{
          background: "var(--panel)",
          borderColor: m.highlight
            ? "oklch(0.82 0.15 78 / 0.4)"
            : "var(--hairline)",
          boxShadow: m.highlight
            ? "var(--glow-accent)"
            : "var(--shadow-resting)",
        }}
      >
        <div className="font-mono text-4xl font-medium tabular-nums tracking-tight sm:text-5xl">
          <span
            ref={ref}
            style={{
              color: m.highlight ? "var(--accent-strong)" : "var(--ink)",
            }}
          >
            {m.prefix}
            {display}
            {m.suffix}
          </span>
        </div>
        <p className="mt-4 text-sm font-medium">{m.label}</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-muted)]">
          {m.business}
        </p>
      </div>
    </Reveal>
  );
}

export function MetricsCounters() {
  return (
    <section
      id="metricas"
      className="relative border-t"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-28">
        <Reveal>
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)" }}
          >
            Numbers that matter
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
            Real contract metrics — verified in every test, not in a pitch deck.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m, i) => (
            <MetricCard key={m.label} m={m} delay={i * 60} />
          ))}
        </div>

        {/* 4.1 — Live metric slot. Omitted intentionally: no on-chain read wired here
             to avoid showing a hardcoded value as if it were real. If enabled later,
             use wagmi useReadContract with [COMPLETAR: dirección del contrato / ABI]
             and only the read-only functions listed in the brief. */}
      </div>
    </section>
  );
}
