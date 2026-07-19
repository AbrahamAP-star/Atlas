// Migrated 1:1 from frontend/src/types/landing.ts (docs/08_FRONTEND_MIGRATION.md).
// Types for the dApp Hero (docs/06_FRONTEND_VISUAL_UPGRADE.md §9). No
// dependency on wagmi/viem: it's curated content, not on-chain.

// "rtl" = content moves right to left; "ltr" = left to right. Named after
// the real visual direction, not the x/xPercent sign, so there's no
// ambiguity when reading the spec vs the code.
export type CarouselDirection = "rtl" | "ltr";

export type ShowcaseCategory =
  | "architecture"
  | "energy"
  | "agriculture"
  | "technology"
  | "medicine"
  | "robotics"
  | "education"
  | "startup"
  | "finance"
  | "infrastructure"
  | "ai";

export interface ShowcaseItem {
  id: string;
  src: string;
  alt: string;
  category: ShowcaseCategory;
}
