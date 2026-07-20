import { Reveal } from "./Reveal";

// Design decisions with an explicit trade-off, not just features.
// Different from SecuritySection (concrete protections): this is the "why"
// behind architecture decisions that a technical client values seeing.
const decisions = [
  {
    title: "No campaign deadline",
    body: "The creator withdraws whenever they decide; the backer can refund at any time before the claim. Fewer possible states, less bug surface.",
  },
  {
    title: "Pull-payment pattern, never push",
    body: "Each user withdraws their own balance. No loop over backers that could block the contract due to a gas limit.",
  },
  {
    title: "Own backend for IPFS",
    body: "The Pinata API key never travels to the public bundle. Only the server knows it; the frontend authenticates via wallet signature.",
  },
  {
    title: "ReentrancyGuardTransient (EIP-1153)",
    body: "Transient storage instead of classic storage: saves ~2.5k–5k gas per call, critical for the hard 120k gas limit on pledge.",
  },
];

export function ArchitectureDecisions() {
  return (
    <section
      id="decisiones"
      className="relative border-t"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-28">
        <Reveal>
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)" }}
          >
            Architecture decisions
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            Every design choice has a documented reason, not just intuition.
          </h2>
        </Reveal>

        <ul className="mt-14 grid gap-4 md:grid-cols-2">
          {decisions.map((d, i) => (
            <Reveal key={d.title} delay={i * 70} as="li">
              <div
                className="h-full rounded-2xl border p-6 card-hover hover:card-hover-lift"
                style={{
                  background: "var(--panel)",
                  borderColor: "var(--hairline)",
                }}
              >
                <h3
                  className="text-base font-semibold"
                  style={{ color: "var(--accent-strong)" }}
                >
                  {d.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                  {d.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
