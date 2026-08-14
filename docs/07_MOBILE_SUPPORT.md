# Mobile Support

## Purpose
Documents that the dApp was adapted to look/work well on phones (~360px-428px wide), and serves as reference for any future agent adding new components: follow the same lightweight mobile-first pattern here, don't invent another.

## Diagnosis (2026-07-14): what was broken on mobile before this change
- `.app-header` was a non-wrapping flex row: title and `ConnectWallet` (network selector + address + button) fought for width and overflowed/squeezed on narrow screens.
- `.pledge-form`/`.action-block` were fixed rows: on narrow screens the amount input and buttons got cramped or text got clipped.
- `.tx-toast-stack` had a fixed `max-width: 320px` pinned to a corner: on a 360px phone it sat nearly flush against the edges with no visual margin.
- Buttons had no `min-height`: below the recommended ~44px comfortable tap target, hard to tap precisely on small screens.
- `.file-field`/`.file-attachment-card` (document drag-and-drop in `CreateProjectForm.tsx`) never had any CSS of their own — rendered as plain text with no box, a problem at any screen size but more noticeable on mobile from the lack of tactile affordance.
- Everything else (`.project-grid`'s `auto-fill`, `.hero-title`'s `clamp()`, the hero/marquee) was already responsive from its original implementation — untouched.

## What was done
All CSS-only, inside the pre-existing `@media (max-width: 640px)` block (extended, not duplicated) + a new size-agnostic block for `.file-field`/`.file-attachment-card` (a real gap, not mobile-specific). No `.tsx` component changed structurally — the goal was solving this with zero extra JS or scattered new breakpoints.
- `.app-header`: `flex-direction: column` on mobile, smaller title (`1.3rem`), `.wallet-box` full width.
- `.pledge-form`: `flex-direction: column` on mobile (input and "Pledge" button stack instead of sharing a narrow row).
- `.action-block`/`.view-toolbar`: `flex-wrap: wrap` so action buttons wrap instead of overflowing.
- `.tx-toast-stack`: anchored to `left/right: 1rem` (fluid width with margin) on mobile instead of a fixed corner `max-width`.
- Buttons: `min-height: 44px` on mobile.
- `.file-field`/`.file-attachment-card`: new styles (all screen sizes), `flex-wrap` + `text-overflow: ellipsis` on the filename so a long name doesn't break the layout on narrow screens.

## What was NOT touched (and why)
- `index.html`'s meta viewport was already correct since Phase 4 — verified, no changes needed.
- `.project-grid` (`repeat(auto-fill, minmax(240px, 1fr))`) already collapses to one column on mobile natively via CSS Grid.
- Hero/marquee (`06_FRONTEND_VISUAL_UPGRADE.md` §9): its `clamp()` title and existing `@media (max-width: 640px)` reductions were already there from the original implementation.
- Tablet breakpoints (e.g. 768-1024px): deliberately not added — the single centered container (`max-width: 880px`) already behaves fine on tablet; adding an intermediate breakpoint without a real problem to solve would be unjustified complexity.

## Pending (non-blocking, future candidate if real usage demands it)
- Never tested on a real physical device, only devtools/responsive mode — recommended Abraham validate on a real phone (system fonts, tap targets, and MetaMask Mobile/mobile-wallet signing flow can behave differently than desktop Chrome devtools).
- `useInfiniteMarquee.ts`/`CarouselRow.tsx` weren't reviewed for touch interactions (e.g. pausing the marquee on tap instead of only hover, which doesn't exist on touch) — the marquee keeps running, functional but without that tactile polish detail.
