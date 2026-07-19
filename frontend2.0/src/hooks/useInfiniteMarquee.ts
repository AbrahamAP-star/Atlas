import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { CarouselDirection } from "@/types/landing";

// Migrated 1:1 from frontend/src/hooks/useInfiniteMarquee.ts (docs/08_FRONTEND_MIGRATION.md).

interface Options {
  direction: CarouselDirection;
  speedPxPerSecond?: number;
}

// Infinite marquee with GSAP: the <track> (see CarouselRow) already comes with
// its item set duplicated once. Animating xPercent from 0 to -50 (or the
// reverse) travels exactly one full set; on repeat (repeat: -1) the tween
// jumps back instantly to the initial value, but since the second set is
// identical to the first, that jump is invisible — it's the standard
// "seamless marquee" pattern. Only `transform` is animated (via xPercent),
// GPU-friendly, with no React rerenders (the movement lives entirely in GSAP).
export function useInfiniteMarquee<T extends HTMLElement>({
  direction,
  speedPxPerSecond = 40,
}: Options) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<T | null>(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      const row = rowRef.current;
      if (!track || !row) return;

      // One full set = half the total width (the track is duplicated).
      // Only used to set a constant speed in px/s; the animation itself
      // runs on xPercent (responsive, doesn't depend on recalculating px
      // on every resize).
      const setWidthPx = track.scrollWidth / 2;
      const duration = setWidthPx / speedPxPerSecond;
      const [from, to] = direction === "rtl" ? [0, -50] : [-50, 0];

      const tween = gsap.fromTo(
        track,
        { xPercent: from },
        { xPercent: to, duration, ease: "none", repeat: -1 }
      );

      // Pauses the timeline when the Hero leaves the viewport (avoids wasting
      // CPU off-screen) and resumes it when it re-enters. IntersectionObserver
      // instead of a manual scroll listener; no ScrollTrigger because this
      // case only needs on/off, not timing relative to scroll position
      // (KISS, see docs/06_FRONTEND_VISUAL_UPGRADE.md).
      const io = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? tween.play() : tween.pause()),
        { threshold: 0 }
      );
      io.observe(row);

      return () => io.disconnect();
    },
    { scope: rowRef, dependencies: [direction, speedPxPerSecond] }
  );

  return { rowRef, trackRef };
}
