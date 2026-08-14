import { describe, it, expect } from "vitest";
import {
  shouldShowStalePledgeBanner,
  STALE_PLEDGE_THRESHOLD_DAYS,
} from "./pledgeAgeBanner";

describe("shouldShowStalePledgeBanner", () => {
  it("stays silent once the project is claimed, no matter the age", () => {
    expect(
      shouldShowStalePledgeBanner({ claimed: true, daysSinceLastPledge: 999 }),
    ).toBe(false);
  });

  it("stays silent when there is no pledge data (never pledged, or log read failed)", () => {
    expect(
      shouldShowStalePledgeBanner({
        claimed: false,
        daysSinceLastPledge: undefined,
      }),
    ).toBe(false);
  });

  it("stays silent below the threshold", () => {
    expect(
      shouldShowStalePledgeBanner({
        claimed: false,
        daysSinceLastPledge: STALE_PLEDGE_THRESHOLD_DAYS - 1,
      }),
    ).toBe(false);
  });

  it("shows exactly at the threshold (inclusive boundary)", () => {
    expect(
      shouldShowStalePledgeBanner({
        claimed: false,
        daysSinceLastPledge: STALE_PLEDGE_THRESHOLD_DAYS,
      }),
    ).toBe(true);
  });

  it("shows above the threshold", () => {
    expect(
      shouldShowStalePledgeBanner({
        claimed: false,
        daysSinceLastPledge: STALE_PLEDGE_THRESHOLD_DAYS + 10,
      }),
    ).toBe(true);
  });
});
