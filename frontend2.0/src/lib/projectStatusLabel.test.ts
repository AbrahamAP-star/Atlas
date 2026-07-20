import { describe, it, expect } from "vitest";
import { getProjectStatus } from "./projectStatusLabel";

describe("getProjectStatus", () => {
  it("shows 'In progress' below goal", () => {
    expect(
      getProjectStatus({ claimed: false, pledged: 50n, goal: 100n }),
    ).toEqual({
      label: "In progress",
      className: "pending",
    });
  });

  it("shows 'Goal reached' once pledged >= goal", () => {
    expect(
      getProjectStatus({ claimed: false, pledged: 100n, goal: 100n }),
    ).toEqual({
      label: "Goal reached",
      className: "ok",
    });
  });

  it("shows 'Withdrawn' once claimed, regardless of pledged/goal", () => {
    expect(
      getProjectStatus({ claimed: true, pledged: 0n, goal: 100n }),
    ).toEqual({
      label: "Withdrawn",
      className: "ok",
    });
  });
});
