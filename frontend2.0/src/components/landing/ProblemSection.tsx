import { Reveal } from "./Reveal";

export function ProblemSection() {
  return (
    <section
      id="problema"
      className="relative border-t"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto max-w-4xl px-6 py-28">
        <Reveal>
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)" }}
          >
            The problem
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Raise capital without banks or centralized platforms — and without
            betting on the other side's good faith.
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[color:var(--ink-muted)] sm:text-lg">
            Businesses and creators need to fund projects without relying on
            slow intermediaries or handing over custody of the funds. The
            guarantee has to live in the code: the money must never disappear,
            never get stuck, and an exit must always be available for both
            parties.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
