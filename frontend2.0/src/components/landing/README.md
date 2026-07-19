# portfolio-landing — integration into the real project

Self-contained components. Meant to be copied as-is into an existing
React 19 + TypeScript + Vite project (Tailwind v4 + shadcn/ui + lucide).
No dependency on a server framework, routing, or new libraries.

## Integration steps (checklist)

1. Copy the whole folder to `src/components/portfolio-landing/` in the
   target project. It doesn't overwrite any existing file (`landing/`,
   `ProjectList.tsx`, `ConnectWallet.tsx`, etc. stay intact).
2. Confirm these tokens already exist in the real project's `:root`:
   `--ink, --paper, --panel, --accent, --accent-strong,`
   `--shadow-resting, --shadow-raised, --shadow-floating, --glow-accent,`
   `--ease-out-expo, --ease-spring, --dur-fast, --dur-base, --dur-slow`.
   If the naming matches, nothing needs to change. If it differs, do a
   single find & replace in this folder.
3. Add the Tailwind v4 utilities used here (`reveal`, `reveal-in`,
   `card-hover`, `card-hover-lift`, `glow-ring`, `hairline-grid`) to the
   real project's `styles.css` (`@utility` block). They're in this
   preview's `src/styles.css` as a direct reference.
4. Mount the landing as a separate view/route — for example a new
   value in the real project's view `useState`, or a new page.
   Don't rename `Hero` to avoid colliding with the existing
   `landing/Hero.tsx` (here it already lives under `portfolio-landing/`).
5. Replace the `[FILL IN: ...]` markers:
   - Hero's main CTA (contact text)
   - Live demo URL and repo URL
   - Email, Calendly, personal name
   - (Optional) contract address + ABI if the live metric is enabled
6. Live metric (§4.1 of the brief): **omitted on purpose** to avoid
   showing a hardcoded value as if it were real. To enable it,
   add a single `MetricCard` that uses wagmi's `useReadContract` with
   `nextProjectId` or `getProject(id)` — the only read functions
   allowed by the brief. Never write functions.

## Dependencies expected in the target project

Already present in the real project, no extra install needed:
`react@19`, `typescript`, `tailwindcss@4`, `lucide-react`.

Framer Motion, motion, and GSAP are **not** used in these components —
the animations are CSS + an `IntersectionObserver` (`hooks.ts`). If the
project already has GSAP for other sections, the reveal can be migrated
without changing the components' public API.
