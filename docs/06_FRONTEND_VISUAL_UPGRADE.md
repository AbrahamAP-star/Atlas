# Frontend Visual Upgrade — AI Agent Reference Map

## Purpose
This is an **execution map**, not a phase to complete end-to-end. When Abraham requests a concrete visual effect (e.g. *"elevate this hover and add a neon glow on mouseover"*), the agent should:
1. Find the requested effect in **§4 Effect Catalog** (or the closest match).
2. Use the tool that effect indicates (§2), already installed per §3.
3. Apply the §5 design tokens (don't invent loose new colors/durations).
4. Verify the §6 performance/accessibility checklist before calling it done.
5. Touch **only** the relevant component/file — this doc is purely visual, never justifies touching `contracts/`, write hooks (`useCreateProject`, `usePledge`, etc.), or `useNetworkStatus`/`useProjectStatus` logic.

Not a mandatory sequential roadmap like `03_PLAN_FASES.md`: §7's "blocks" activate on demand, in whatever order Abraham requests.

## Context: inspiration
Analysis of `optimism.io`/`immutable.com` (both run Next.js + native image optimization, Optimism also uses Sanity CMS). **Not migrating to Next.js** — over-engineering for a single-flow dApp (list/create/pledge/claim/refund) with no real SSR/CMS need. What IS replicable on the current stack (Vite + React 19): count-up stats on viewport entry, tab transitions without reload, soft-elevation card hovers with colored shadow, dark palette with a single accent color and generous negative space (already present).

## 1. Stack baseline (starting point, don't touch without reason)
`react`/`react-dom` 19.2.7, `vite` 8.1.3, `@vitejs/plugin-react` 6.0.3. CSS: vanilla with `:root` tokens in `styles.css` (`--ink`, `--paper`, `--accent`, etc.). Tailwind v4 + shadcn/ui moved from "optional" to **decided** (2026-07-10, see §9) — don't assume already installed without checking.

## 2. New recommended tools (when to use each)
| Tool | For | When NOT to use |
|---|---|---|
| **GSAP + `@gsap/react`** | Complex imperative animation: scroll-trigger, timelines, counters, morphing, stagger. Industry standard (100% free since 2025, incl. SplitText/MorphSVG). | A simple fade/hover CSS alone handles just as well with less JS. |
| **Native CSS** (transitions/animations/`@property`) | Hovers, elevation, glow, color/shadow transitions — 80% of "UI polish" doesn't need JS. | Effect depends on scroll-position or relative-timed multi-element sequencing. |
| **View Transitions API** (`document.startViewTransition`) | Smooth `list`→`detail`→`create` transitions in `App.tsx`, zero install. Chrome/Edge/Safari recent; degrades to instant switch elsewhere, non-breaking. | — |
| **Tailwind CSS v4** (DECIDED 2026-07-10, §9) | v4's `@theme` reads existing CSS custom properties directly — no palette rewrite. Speeds up hover/state variants. Adopted for the Hero/landing for Abraham's explicit learning purposes. | Don't use to replace already-working vanilla CSS outside the task's scope — incremental adoption, not a rewrite. |
| **shadcn/ui** (DECIDED 2026-07-10, §9) | Repo-copied components (not a closed dependency) for one-off UI pieces (buttons, CTAs) without reinventing accessibility/state. Requires Tailwind. | Don't force it onto custom visual content (e.g. the §9.2 marquee) that gains nothing from a generic component. |
| **`vite-imagetools`** | Serve campaign metadata images (from IPFS, in `ProjectCard`/`ProjectDetail`) as optimized AVIF/WebP instead of the raw gateway original. | — |

**Install (versions verified on npmjs.com 2026-07-10 — reconfirm if time has passed):**
```bash
npm install gsap@3.15.0 @gsap/react@2.1.2
npm install tailwindcss@4.3.2 @tailwindcss/vite@4.3.2
npx shadcn@latest init
```
For `vite-imagetools`, confirm the latest stable version on npmjs.com before installing.
**Why GSAP over Framer Motion/`motion`:** both valid, but GSAP gives finer imperative control for cursor-follow glow or multi-step sequenced timelines (elevation+shadow+glow), matching Abraham's example ask. If a more declarative/React-idiomatic API is ever preferred, `motion` is the alternative — don't install both at once (redundant).

## 3. Install rules
Exact pinned versions, no `^`/`~` (project convention). Verify real npm version before writing `package.json`, never assume from memory. Any new library gets justified in `04_STATUS.md` when the task closes.

## 4. Design tokens — `:root` extension
Add to `styles.css` (don't replace existing tokens):
```css
:root {
  --shadow-resting: 0 1px 2px rgba(20, 33, 31, 0.08), 0 1px 1px rgba(20, 33, 31, 0.06);
  --shadow-raised: 0 8px 24px rgba(20, 33, 31, 0.16), 0 2px 6px rgba(20, 33, 31, 0.10);
  --shadow-floating: 0 20px 48px rgba(20, 33, 31, 0.22), 0 4px 12px rgba(20, 33, 31, 0.12);
  --glow-accent: 0 0 24px rgba(79, 122, 104, 0.55), 0 0 48px rgba(79, 122, 104, 0.25);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dur-fast: 150ms; --dur-base: 280ms; --dur-slow: 480ms;
}
```
Rule: every new effect reuses these tokens, never a hardcoded `0.3s ease` or loose shadow color.

## 5. Effect catalog (consult on request)
- **5.1 Soft-elevation hover** — pure CSS, animate only `transform`/`box-shadow`. `translateY(-4px)` + `--shadow-raised` on `:hover`, transition using `--dur-base`/`--ease-out-expo`.
- **5.2 Hover glow/neon** (Abraham's example) — pure CSS via a blurred `::after` pseudo-element (opacity 0→0.6 on hover) for a static glow, or GSAP tracking `--mx`/`--my` custom properties + `radial-gradient(circle at var(--mx) var(--my), ...)` if the glow should follow the cursor.
- **5.3 Count-up stat** — GSAP + ScrollTrigger, `once: true`, applies to raised-amount/progress numbers.
- **5.4 View transition** (list→detail→create) — native View Transitions API wrapping the `setView` call, no-op fallback otherwise.
- **5.5 Skeleton/shimmer while loading** — pure CSS `@keyframes` gradient sweep, for `useReadContracts` loading states.
- **5.6 Magnetic button** — GSAP, tracks pointer offset from center (`* 0.25`), `elastic.out` on leave (matches `--ease-spring`). For primary CTAs.
- **5.7 Staggered reveal on viewport entry** — GSAP + ScrollTrigger `stagger`, for the project grid.
- **5.8 Animated gradient border** ("featured"/in-progress state) — pure CSS `@property --angle` + rotating `conic-gradient`.

## 6. Mandatory checklist before calling an effect done
1. Respect `prefers-reduced-motion` (global override + `gsap.matchMedia()` to fully disable timelines, not just shorten them).
2. Animate only `transform`/`opacity` when 60fps matters (never `width`/`top`/`left`, they force reflow).
3. Clean up `pointermove`/GSAP listeners on unmount (avoid leaks, e.g. on `ProjectCard`).
4. Never duplicate or replace `useProjectStatus`/`useNetworkStatus` logic — visual effects sit on top of their results only.
5. Bundle size: for a simple hover, prefer the CSS version over GSAP — GSAP is reserved for what CSS can't do.

## 7. Suggested work blocks (on demand, not a mandatory roadmap)
A — Foundations (install GSAP, add §5 tokens, `useCursorGlow`/`useMagneticHover` hooks). B — `ProjectCard`/`ProjectList` (hover, glow, stagger, skeleton). C — `ProjectDetail` (count-up, animated border). D — CTAs (magnetic button, shimmer loading states). E — Navigation (View Transitions). Each block is independent.

## 8. Keeping this doc current
When a library is installed or a recommendation is dropped, document the decision here (not just `04_STATUS.md`), so this stays the source of truth for "what visual tooling is actually in the project" vs. "what was evaluated and not used".

## 9. Landing hero + infinite carousels — CLOSED (2026-07-11)
Abraham requested the landing hero: 3 vertical "infinite marquees" of real project images, alternating directions, no third-party carousel libraries. (The full detailed prompt used lives outside the repo, delivered to Abraham as `prompt_hero_landing_adaptado.txt`; this §9 is the summary kept in-repo.)

**Stack decisions this introduced:** Tailwind v4 + shadcn/ui installed (explicit reason: Abraham's learning, not a technical need of the hero itself — the marquee could be done equally well in vanilla CSS), mapped onto existing `styles.css` tokens rather than a parallel palette. The marquee itself uses GSAP (already decided in §2), never Framer Motion or a carousel library (Swiper/Slick/Owl explicitly excluded). No React Router (consistent with the rest of the project's routing-avoidance rationale).

**Image content:** real, hand-curated project photos (not stock/AI-generated), in `src/assets/`, statically imported (never from IPFS/a remote gateway — deliberately distinct from the real campaign-image flow via Pinata, untouched by this task).

**New components (don't collide with the real dApp):** `components.json`, `components/ui/` (shadcn-generated), `components/landing/{Hero,CarouselRow,ShowcaseCard,LandingCTA}.tsx` (`ShowcaseCard` distinct from the contract-dependent `ProjectCard`), `hooks/useInfiniteMarquee.ts`, `data/showcase.data.ts`, `types/landing.ts`, `lib/utils.ts` (shadcn's `cn()` helper). `landing/` kept separate from the rest of `components/` on purpose: curated content with zero wagmi/viem dependency, safe to iterate on without any fund-logic risk.

**Hard requirements:** 60 FPS via `transform: translate3d()` (never React re-renders/`setInterval`), seamless infinite loop (duplicated item set, no "end" detection), pause via IntersectionObserver when off-viewport (never manual scroll listeners), `prefers-reduced-motion` respected via `gsap.matchMedia()` (static, no-loop fallback), Lighthouse Performance/Accessibility/Best-Practices/SEO target ≥95.

**Status — CLOSED (2026-07-11):** implemented exactly as planned. Dependencies (versions verified same-day): `gsap@3.15.0`, `@gsap/react@2.1.2`, `tailwindcss@4.3.2`+`@tailwindcss/vite@4.3.2` (dev), `class-variance-authority@0.7.1`, `clsx@2.1.1`, `tailwind-merge@3.6.0`, `lucide-react@1.24.0`. `vite.config.ts`/`tsconfig.json` updated (`@tailwindcss/vite` plugin, `@`→`src` alias). `styles.css`'s `@theme` maps `--color-*` onto existing tokens and re-exposes `--shadow-*`/`--ease-*` so both vanilla `var()` CSS and Tailwind utilities read the same values. `useInfiniteMarquee.ts`: seamless loop via `gsap.fromTo(xPercent)` with `repeat: -1` over a duplicated track, paused/resumed via IntersectionObserver (not ScrollTrigger — this only needs on/off, not scroll-relative timing, per KISS). `CarouselRow.tsx`: non-duplicated static grid under `prefers-reduced-motion: reduce`, real marquee marked `aria-hidden` (decorative duplicate content). `ShowcaseCard.tsx`: transform/box-shadow-only hover, `loading="lazy"` except the first 3 images per row (`priority`+`eager`+`fetchPriority="high"`). `showcase.data.ts`: explicit static imports (15 images at the time, 2 deliberately excluded as non-project photos). No React Router or third-party carousel library installed. **Non-blocking pending:** measure Lighthouse once Abraham runs `npm run build`/`preview` locally.
