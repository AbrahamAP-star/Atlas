import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectDetail } from "./ProjectDetail";

// Every dependency below is mocked so this stays a component-integration
// test (right props reach lib/projectPermissions.ts, right buttons render)
// without needing a real WagmiProvider/RPC — that's exactly the gap that
// caused the canClaim/canRefund bug (04_STATUS.md, sesion 2026-07-14).
vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return { ...actual, useAccount: vi.fn() };
});
vi.mock("@/hooks/useProjects", () => ({ useProject: vi.fn() }));
vi.mock("@/hooks/useProjectMetadata", () => ({ useProjectMetadata: vi.fn() }));
vi.mock("@/hooks/useProjectStatus", () => ({ useProjectStatus: vi.fn() }));
vi.mock("@/hooks/useNetworkStatus", () => ({ useNetworkStatus: vi.fn() }));
// Real usePledgeAge calls wagmi's usePublicClient, which throws without a
// WagmiProvider — this file never mounts one, so it must be mocked like
// every other hook here. Its own behavior is covered in usePledgeAge.test.ts.
vi.mock("@/hooks/usePledgeAge", () => ({ usePledgeAge: vi.fn() }));
vi.mock("@/hooks/useClaimFunds", () => ({ useClaimFunds: vi.fn() }));
vi.mock("@/hooks/useRefund", () => ({ useRefund: vi.fn() }));
vi.mock("@/hooks/useDeleteProject", () => ({ useDeleteProject: vi.fn() }));
vi.mock("@/lib/sounds", () => ({
  playBackSound: vi.fn(),
  playDeleteSound: vi.fn(),
}));
// PledgeForm pulls in usePledge (another useWriteContract) — stubbed so this
// file stays scoped to ProjectDetail's own render logic, not PledgeForm's.
vi.mock("./PledgeForm", () => ({
  PledgeForm: () => <div data-testid="pledge-form" />,
}));

import { useAccount } from "wagmi";
import { useProject } from "@/hooks/useProjects";
import { useProjectMetadata } from "@/hooks/useProjectMetadata";
import { useProjectStatus } from "@/hooks/useProjectStatus";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePledgeAge } from "@/hooks/usePledgeAge";
import { useClaimFunds } from "@/hooks/useClaimFunds";
import { useRefund } from "@/hooks/useRefund";
import { useDeleteProject } from "@/hooks/useDeleteProject";

const CREATOR = "0x1111111111111111111111111111111111111111" as const;
const BACKER = "0x2222222222222222222222222222222222222222" as const;

const baseProject = {
  creator: CREATOR,
  goal: 100n,
  pledged: 100n,
  claimed: false,
  metadataCID: "bafy123",
};

// Sane defaults so each test only overrides what it needs to exercise.
function mockAll(overrides: {
  account?: `0x${string}`;
  project?: typeof baseProject;
  isSuccessful?: boolean;
  myPledge?: bigint;
  canInteract?: boolean;
}) {
  vi.mocked(useAccount).mockReturnValue({
    address: overrides.account,
  } as never);
  vi.mocked(useProject).mockReturnValue({
    project: overrides.project ?? baseProject,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as never);
  vi.mocked(useProjectMetadata).mockReturnValue({
    metadata: { title: "Solar Farm", description: "Panels for the village." },
    imageUrl: undefined,
    documentUrl: undefined,
  } as never);
  vi.mocked(useNetworkStatus).mockReturnValue({
    canInteract: overrides.canInteract ?? true,
  } as never);
  // Purely informational (roadmap §14): irrelevant to which buttons render,
  // so every test gets the same silent default unless it says otherwise.
  vi.mocked(usePledgeAge).mockReturnValue({
    lastPledgedAt: undefined,
    daysSinceLastPledge: undefined,
    isLoading: false,
  } as never);
  vi.mocked(useProjectStatus).mockReturnValue({
    isSuccessful: overrides.isSuccessful ?? false,
    myPledge: overrides.myPledge ?? 0n,
    address: "0xcontract",
    refetch: vi.fn(),
  } as never);
  vi.mocked(useClaimFunds).mockReturnValue({
    claimFunds: vi.fn(),
    status: "idle",
    hash: undefined,
  } as never);
  vi.mocked(useRefund).mockReturnValue({
    refund: vi.fn(),
    status: "idle",
    hash: undefined,
  } as never);
  vi.mocked(useDeleteProject).mockReturnValue({
    deleteProject: vi.fn(),
    status: "idle",
    hash: undefined,
  } as never);
}

describe("ProjectDetail", () => {
  it("shows loading state while the project is being read", () => {
    mockAll({ account: CREATOR }); // safe defaults for every hook: they all run before the isLoading early return
    vi.mocked(useProject).mockReturnValue({
      project: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as never);
    render(<ProjectDetail id={0} onBack={vi.fn()} />);
    expect(screen.getByText(/Loading project/)).toBeInTheDocument();
  });

  it("shows the creator only the Claim button once the goal is reached and funds are unclaimed", () => {
    mockAll({
      account: CREATOR,
      isSuccessful: true,
      project: { ...baseProject, claimed: false },
    });
    render(<ProjectDetail id={0} onBack={vi.fn()} />);

    expect(screen.getByText("Claim funds")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Request refund/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Delete project")).not.toBeInTheDocument();
    expect(screen.getByTestId("pledge-form")).toBeInTheDocument(); // still open: not claimed yet
  });

  it("shows a backer with an active pledge only the Refund button, never Claim", () => {
    mockAll({ account: BACKER, isSuccessful: true, myPledge: 30n });
    render(<ProjectDetail id={0} onBack={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /Request refund/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Claim funds")).not.toBeInTheDocument();
  });

  it("shows the creator the Delete button once claimed, and hides the pledge form", () => {
    mockAll({ account: CREATOR, project: { ...baseProject, claimed: true } });
    render(<ProjectDetail id={0} onBack={vi.fn()} />);

    expect(screen.getByText("Delete project")).toBeInTheDocument();
    expect(screen.queryByTestId("pledge-form")).not.toBeInTheDocument();
  });

  it("hides every action button on an unsupported network even for the creator", () => {
    mockAll({ account: CREATOR, isSuccessful: true, canInteract: false });
    render(<ProjectDetail id={0} onBack={vi.fn()} />);

    expect(screen.queryByText("Claim funds")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Request refund/ }),
    ).not.toBeInTheDocument();
  });
});
