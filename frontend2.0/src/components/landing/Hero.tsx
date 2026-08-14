import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle node grid backdrop — decorative, low opacity, no parallax */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hairline-grid opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.82 0.15 78 / 0.18), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col items-center justify-center px-6 pt-28 pb-24 text-center">
        <Reveal immediate>
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs tracking-wide uppercase text-[color:var(--ink-muted)]"
            style={{ borderColor: "var(--hairline)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 8px var(--accent)",
              }}
            />
            Case study · Atlas Protocol
          </span>
        </Reveal>

        <Reveal immediate delay={80}>
          <h1 className="mt-8 max-w-4xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Meet Atlas — the on-chain contract that holds crowdfunding funds{" "}
            <span style={{ color: "var(--accent)" }}>until both sides get what they agreed on</span>.
          </h1>
        </Reveal>

        <Reveal immediate delay={160}>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[color:var(--ink-muted)] sm:text-lg">
            No bank, no platform, no middleman holding the money. Funds sit in
            the contract itself — released to the creator only on success, or
            back to the backer on request — deployed, verified, and statically
            audited.
          </p>
        </Reveal>

        <Reveal immediate delay={240}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#contacto"
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium card-hover glow-ring hover:card-hover-lift"
              style={{ background: "var(--accent)", color: "var(--paper)" }}
            >
              {/* [FILL IN: main contact text] */}
              Let's talk about your project
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium card-hover hover:card-hover-lift"
              style={{ borderColor: "var(--hairline)" }}
            >
              See live demo
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
