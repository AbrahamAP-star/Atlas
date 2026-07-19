import { Reveal } from "./Reveal";

export function ThankYouBand() {
  return (
    <section
      className="relative"
      style={{ background: "oklch(0.09 0.008 55)" }}
      aria-label="Closing message"
    >
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Reveal>
          <p
            className="mx-auto inline-block rounded-2xl border px-8 py-6 text-lg leading-relaxed sm:text-xl"
            style={{
              borderColor: "oklch(0.82 0.15 78 / 0.45)",
              boxShadow: "var(--glow-accent)",
              color: "var(--ink)",
            }}
          >
            Thanks for reading all the way through — if you made it here, we
            should probably talk.
          </p>
        </Reveal>
        <p className="mt-8 font-mono text-xs text-[color:var(--ink-dim)]">
          [FILL IN: name] · Solidity engineering + web3 frontend
        </p>
      </div>
    </section>
  );
}
