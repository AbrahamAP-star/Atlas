import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Migrated 1:1 from frontend/src/components/landing/LandingCTA.tsx (docs/08_FRONTEND_MIGRATION.md).

interface Props {
  onCreate: () => void;
  canCreate: boolean;
}

export function LandingCTA({ onCreate, canCreate }: Props) {
  return (
    <div className="landing-cta">
      <h2>Your project could be next</h2>
      <Button size="lg" onClick={onCreate} disabled={!canCreate}>
        Create project <ArrowRight size={18} aria-hidden="true" />
      </Button>
      {!canCreate && (
        <p className="field-hint">Connect your wallet to create a project.</p>
      )}
    </div>
  );
}
