import type { ShowcaseItem, CarouselDirection } from "@/types/landing";
import { ShowcaseCard } from "./ShowcaseCard";
import { useInfiniteMarquee } from "@/hooks/useInfiniteMarquee";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// Migrated 1:1 from frontend/src/components/landing/CarouselRow.tsx (docs/08_FRONTEND_MIGRATION.md).

interface Props {
  items: ShowcaseItem[];
  direction: CarouselDirection;
  speedPxPerSecond?: number;
}

export function CarouselRow({
  items,
  direction,
  speedPxPerSecond = 40,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const { rowRef, trackRef } = useInfiniteMarquee<HTMLDivElement>({
    direction,
    speedPxPerSecond,
  });

  if (reducedMotion) {
    // prefers-reduced-motion: static grid, not duplicated and without
    // aria-hidden - real, accessible content, not decorative (docs/06_FRONTEND_VISUAL_UPGRADE.md §6.1).
    return (
      <div className="carousel-row carousel-row--static">
        {items.map((item) => (
          <ShowcaseCard key={item.id} item={item} priority />
        ))}
      </div>
    );
  }

  // Infinite loop: the track duplicates the item set once (see why this is
  // enough in useInfiniteMarquee). The marquee is decorative and visually
  // duplicated, so it's hidden from screen readers to avoid announcing
  // repeated/infinite content - the images still carry real alt text in
  // case the marquee is disabled (prefers-reduced-motion) or for other DOM consumers.
  const loopItems = [...items, ...items];
  return (
    <div ref={rowRef} className="carousel-row" aria-hidden="true">
      <div ref={trackRef} className="carousel-track">
        {loopItems.map((item, i) => (
          <ShowcaseCard key={`${item.id}-${i}`} item={item} priority={i < 3} />
        ))}
      </div>
    </div>
  );
}
