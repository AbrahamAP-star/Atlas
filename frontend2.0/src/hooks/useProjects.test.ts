import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProjects, useProject } from "./useProjects";

// getProject returns a tuple with all its components NAMED, so viem decodes
// it as a plain object, not an array — this is the exact shape that once
// broke `toProject`'s array destructuring ("raw is not iterable", see
// 04_STATUS.md § Sesion 2026-07-14).
const mockProjectRaw = {
  creator: "0x1111111111111111111111111111111111111111" as const,
  goal: 100n,
  pledged: 150n,
  claimed: false,
  metadataCID: "bafy123",
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => ({ chainId: 11155111, isConnected: true }),
    // nextProjectId is uint32: viem decodes uint8..uint48 as `number`
    // and only uint56+ as `bigint` — verified directly against viem@2.54.1.
    useReadContract: vi.fn(() => ({ data: 1, isLoading: false })),
    useReadContracts: vi.fn(() => ({
      data: [{ status: "success", result: mockProjectRaw }],
      isLoading: false,
    })),
  };
});

describe("useProjects", () => {
  it("decodes getProject's named-tuple object without throwing (regression: 'raw is not iterable')", () => {
    const { result } = renderHook(() => useProjects());
    expect(result.current.projects).toEqual([
      { id: 0, project: mockProjectRaw },
    ]);
  });

  it("filters out deleted projects (creator == address(0))", async () => {
    const wagmi = await import("wagmi");
    vi.mocked(wagmi.useReadContracts).mockReturnValueOnce({
      data: [
        {
          status: "success",
          result: { ...mockProjectRaw, creator: ZERO_ADDRESS },
        },
      ],
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useProjects());
    expect(result.current.projects).toEqual([]);
  });
});

describe("useProject", () => {
  it("decodes a single project the same way as the listing", async () => {
    const wagmi = await import("wagmi");
    vi.mocked(wagmi.useReadContract).mockReturnValueOnce({
      data: mockProjectRaw,
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useProject(0));
    expect(result.current.project).toEqual(mockProjectRaw);
  });
});
