import { shouldShowStalePledgeBanner } from "@/lib/pledgeAgeBanner";

// docs/09_ROADMAP_MEJORAS.md § 14, Option A. Purely informational: this
// component never disables or hides any button, it only adds transparency
// about a project that has gone quiet — refund/claim keep working exactly
// as lib/projectPermissions.ts already decides, independent of this flag.

interface Props {
  claimed: boolean;
  daysSinceLastPledge: number | undefined;
}

export function PledgeAgeBanner({ claimed, daysSinceLastPledge }: Props) {
  if (!shouldShowStalePledgeBanner({ claimed, daysSinceLastPledge }))
    return null;

  return (
    <p className="stale-pledge-banner" role="note">
      <span aria-hidden="true">⏳</span> This project hasn&apos;t received any
      pledges in the last {daysSinceLastPledge} days. It&apos;s still open — and
      if you backed it and would rather not wait, you can request a refund at
      any time before the creator claims the funds.
    </p>
  );
}
