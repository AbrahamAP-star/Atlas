import { Mail } from "lucide-react";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section
      id="contacto"
      className="relative border-t"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.82 0.15 78 / 0.14), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 py-32 text-center">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>
            Let's work together
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Have a project that needs this level of on-chain rigor?
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-6 text-[color:var(--ink-muted)]">
            Email me. I answer every message personally —
            we'll review your case and I'll tell you honestly if I'm the right person for it.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:fuentesabraham075@gmail.com"
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium card-hover glow-ring hover:card-hover-lift"
              style={{ background: "var(--accent)", color: "var(--paper)" }}
            >
              <Mail className="h-4 w-4" />
              Send an email
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
