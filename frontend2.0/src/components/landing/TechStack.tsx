import { Reveal } from "./Reveal";

const groups = [
  {
    label: "Smart contracts",
    items: [
      "Solidity 0.8.24+",
      "Hardhat 3",
      "OpenZeppelin v5.6.1",
      "ReentrancyGuardTransient",
      "SafeCast",
      "node:test + viem",
      "hardhat-viem-assertions",
      "Slither",
    ],
  },
  {
    label: "Frontend",
    items: [
      "React 19",
      "TypeScript",
      "Vite",
      "Wagmi v3",
      "Viem",
      "TanStack Query",
      "Tailwind CSS v4",
      "shadcn/ui",
      "GSAP",
    ],
  },
  {
    label: "Data infrastructure",
    items: [
      "IPFS (Pinata)",
      "Own Express backend",
      "ECDSA signature auth (nonce)",
      "Per-IP rate limit",
      "No secrets in the bundle",
    ],
  },
  {
    label: "Networks",
    items: [
      "Base (L2)",
      "Ethereum Sepolia",
      "Base Sepolia",
      "Verified contract on explorer",
    ],
  },
];

export function TechStack() {
  return (
    <section id="stack" className="relative border-t" style={{ borderColor: "var(--hairline)" }}>
      <div className="mx-auto max-w-6xl px-6 py-28">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>
            Tech stack
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            Production tools, not tutorial tools.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {groups.map((g, gi) => (
            <Reveal key={g.label} delay={gi * 80}>
              <div
                className="rounded-2xl border p-6"
                style={{ background: "var(--panel)", borderColor: "var(--hairline)" }}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--ink-dim)]">
                  {g.label}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {g.items.map((it) => (
                    <li
                      key={it}
                      className="rounded-full border px-3 py-1 font-mono text-xs tracking-tight text-[color:var(--ink)]"
                      style={{
                        borderColor: "var(--hairline)",
                        background: "oklch(0.25 0.016 55 / 0.6)",
                      }}
                    >
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
