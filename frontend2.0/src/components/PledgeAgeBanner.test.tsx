import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PledgeAgeBanner } from "./PledgeAgeBanner";
import { STALE_PLEDGE_THRESHOLD_DAYS } from "@/lib/pledgeAgeBanner";

// Component-level check on top of pledgeAgeBanner.test.ts's pure-logic
// coverage: confirms the banner text actually renders/doesn't render in the
// DOM, not just that the boolean is correct.
describe("PledgeAgeBanner", () => {
  it("renders nothing when the project is recent", () => {
    const { container } = render(
      <PledgeAgeBanner claimed={false} daysSinceLastPledge={5} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the notice once the stale threshold is reached", () => {
    render(
      <PledgeAgeBanner
        claimed={false}
        daysSinceLastPledge={STALE_PLEDGE_THRESHOLD_DAYS}
      />,
    );
    expect(
      screen.getByText(new RegExp(`${STALE_PLEDGE_THRESHOLD_DAYS} days`)),
    ).toBeInTheDocument();
  });

  it("stays silent once claimed, even if daysSinceLastPledge is stale", () => {
    const { container } = render(
      <PledgeAgeBanner claimed daysSinceLastPledge={999} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
