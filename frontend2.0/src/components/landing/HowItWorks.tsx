import { FileText, Wallet, HandCoins, Undo2 } from "lucide-react";
import { Reveal } from "./Reveal";

const steps = [
  {
    icon: FileText,
    title: "Publish campaign",
    body: "The creator defines title, description, image, and minimum goal. The metadata is uploaded to IPFS; the contract only stores the CID.",
  },
  {
    icon: Wallet,
    title: "Pledge with no middlemen",
    body: "Any wallet pledges funds directly to the contract. No custody, no platform approving the flow.",
  },
  {
    icon: HandCoins,
    title: "Withdrawal when the creator decides",
    body: "Once the goal is reached, the creator withdraws via pull payment — never automatic, never forced.",
  },
  {
    icon: Undo2,
    title: "Individual refund, always available",
    body: "A backer can request their refund at any time before the creator withdraws, without depending on others.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="flujo"
      className="relative border-t"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-28">
        <Reveal>
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)" }}
          >
            How it works
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            A simple flow, with no surprises for either party.
          </h2>
        </Reveal>

        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={120 + i * 90} as="li">
              <div
                className="group relative flex h-full flex-col rounded-2xl border p-6 card-hover hover:card-hover-lift"
                style={{
                  background: "var(--panel)",
                  borderColor: "var(--hairline)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      background: "oklch(0.82 0.15 78 / 0.12)",
                      color: "var(--accent)",
                    }}
                  >
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs tracking-tight text-[color:var(--ink-dim)]">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
