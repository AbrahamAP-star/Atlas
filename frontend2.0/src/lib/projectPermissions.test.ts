import { describe, it, expect } from "vitest";
import { canPledgeProject, canClaimProject, canRefundProject, canDeleteProject } from "./projectPermissions";

describe("canPledgeProject", () => {
  it("allows pledging while the project isn't claimed", () => {
    expect(canPledgeProject(false)).toBe(true);
  });

  it("blocks pledging once the creator has claimed", () => {
    expect(canPledgeProject(true)).toBe(false);
  });
});

describe("canClaimProject", () => {
  const base = { canInteract: true, isCreator: true, isSuccessful: true, claimed: false };

  it("allows the creator to claim a successful, unclaimed project", () => {
    expect(canClaimProject(base)).toBe(true);
  });

  it("blocks a non-creator even if the project is successful", () => {
    expect(canClaimProject({ ...base, isCreator: false })).toBe(false);
  });

  it("blocks claiming a project that hasn't reached its goal", () => {
    expect(canClaimProject({ ...base, isSuccessful: false })).toBe(false);
  });

  it("blocks claiming twice", () => {
    expect(canClaimProject({ ...base, claimed: true })).toBe(false);
  });

  it("blocks claiming on an unsupported/undeployed network", () => {
    expect(canClaimProject({ ...base, canInteract: false })).toBe(false);
  });
});

describe("canRefundProject", () => {
  const base = { canInteract: true, claimed: false, myPledge: 1n };

  it("allows a refund while there's a pledge and the project isn't claimed", () => {
    expect(canRefundProject(base)).toBe(true);
  });

  it("blocks a refund with no pledge", () => {
    expect(canRefundProject({ ...base, myPledge: 0n })).toBe(false);
  });

  it("blocks a refund once the creator has claimed", () => {
    expect(canRefundProject({ ...base, claimed: true })).toBe(false);
  });
});

describe("canDeleteProject", () => {
  const base = { canInteract: true, isCreator: true, claimed: false, pledged: 0n };

  it("allows deleting a project with no pledges", () => {
    expect(canDeleteProject(base)).toBe(true);
  });

  it("allows deleting an already-claimed project even with historical pledges", () => {
    expect(canDeleteProject({ ...base, claimed: true, pledged: 5n })).toBe(true);
  });

  it("blocks deleting a project with unclaimed active funds", () => {
    expect(canDeleteProject({ ...base, pledged: 5n })).toBe(false);
  });

  it("blocks a non-creator from deleting", () => {
    expect(canDeleteProject({ ...base, isCreator: false })).toBe(false);
  });
});
