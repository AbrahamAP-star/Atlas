import { Button } from "@/components/ui/button";
import { CarouselRow } from "./CarouselRow";
import { LandingCTA } from "./LandingCTA";
import { carouselRows } from "@/data/showcase.data";

// Migrated 1:1 from frontend/src/components/landing/Hero.tsx (docs/08_FRONTEND_MIGRATION.md).
// Relocated to components/dapp/ (not components/landing/): this is the
// ENTRY HERO OF THE DAPP (marquee + "Explore"/"Create"), distinct from the
// portfolio/case-study Hero in components/landing/Hero.tsx that already
// occupied that name/folder in frontend2.0.

interface Props {
  onExplore: () => void;
  onCreate: () => void;
  canCreate: boolean;
}

// Fixed directions from the spec: rows 1 and 3 right->left (rtl), row 2
// left->right (ltr) - never all three the same.
export function Hero({ onExplore, onCreate, canCreate }: Props) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <h1 className="hero-title">Fund real projects, with no middlemen</h1>
        <p className="hero-subtitle">
          On-chain crowdfunding: the funds are held in custody by the contract,
          not by an administrator.
        </p>
        <div className="hero-actions">
          <Button size="lg" onClick={onExplore}>
            Explore projects
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onCreate}
            disabled={!canCreate}
          >
            Create project
          </Button>
        </div>
      </div>

      <div className="hero-carousels">
        <CarouselRow items={carouselRows[0]} direction="rtl" />
        <div className="carousel-divider" />
        <CarouselRow items={carouselRows[1]} direction="ltr" />
        <div className="carousel-divider" />
        <CarouselRow items={carouselRows[2]} direction="rtl" />
      </div>

      <LandingCTA onCreate={onCreate} canCreate={canCreate} />
    </section>
  );
}
