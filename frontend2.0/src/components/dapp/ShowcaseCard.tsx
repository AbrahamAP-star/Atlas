import type { ShowcaseItem } from "@/types/landing";

// Migrated 1:1 from frontend/src/components/landing/ShowcaseCard.tsx (docs/08_FRONTEND_MIGRATION.md).
// Relocated to components/dapp/ (not components/landing/) to avoid colliding
// with the portfolio/case-study Hero that already occupies that name in frontend2.0.

interface Props {
  item: ShowcaseItem;
  priority?: boolean;
}

// Purely visual Hero card - distinct from ProjectCard.tsx (which reads real
// on-chain goal/pledged/metadataCID via useProjects/useProject). This one
// has no interaction or contract logic, it just presents a curated photo.
export function ShowcaseCard({ item, priority = false }: Props) {
  return (
    <figure className="showcase-card">
      <img
        src={item.src}
        alt={item.alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        draggable={false}
      />
    </figure>
  );
}
