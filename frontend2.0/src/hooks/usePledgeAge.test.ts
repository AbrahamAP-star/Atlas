import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { usePledgeAge } from "./usePledgeAge";

// usePublicClient/useAccount come from wagmi; only the pieces this hook
// actually touches (via useNetworkStatus) need real behavior for the test.
vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return { ...actual, usePublicClient: vi.fn(), useAccount: vi.fn() };
});
vi.mock("./useNetworkStatus", () => ({ useNetworkStatus: vi.fn() }));

import { usePublicClient, useAccount } from "wagmi";
import { useNetworkStatus } from "./useNetworkStatus";

const CONTRACT_ADDRESS = "0xcontract0000000000000000000000000000000";
const PLEDGED_AT_SECONDS = 1_000_000n; // arbitrary fixed block timestamp

// No JSX (file stays .ts, matching every other hook test in this folder).
function wrapper({ children }: { children: ReactNode }) {
  // A fresh, retry-free QueryClient per test avoids cross-test cache bleed
  // and long retry backoffs slowing the suite down.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

function mockNetworkReady() {
  vi.mocked(useAccount).mockReturnValue({} as never);
  vi.mocked(useNetworkStatus).mockReturnValue({
    address: CONTRACT_ADDRESS,
    canInteract: true,
  } as never);
}

describe("usePledgeAge", () => {
  it("returns undefined when the project has no Pledged logs yet", async () => {
    mockNetworkReady();
    vi.mocked(usePublicClient).mockReturnValue({
      getBlockNumber: vi.fn().mockResolvedValue(1_000n),
      getContractEvents: vi.fn().mockResolvedValue([]),
    } as never);

    const { result } = renderHook(() => usePledgeAge(0), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lastPledgedAt).toBeUndefined();
    expect(result.current.daysSinceLastPledge).toBeUndefined();
  });

  it("computes days elapsed from the most recent Pledged log's block timestamp", async () => {
    mockNetworkReady();
    const twentyDaysAgoSeconds =
      BigInt(Math.floor(Date.now() / 1000)) - 20n * 24n * 60n * 60n;
    vi.mocked(usePublicClient).mockReturnValue({
      getBlockNumber: vi.fn().mockResolvedValue(2_000n),
      getContractEvents: vi.fn().mockResolvedValue([
        { blockNumber: 1_500n },
        { blockNumber: 1_900n }, // last in array = most recent, per ascending block order
      ]),
      getBlock: vi.fn().mockResolvedValue({ timestamp: twentyDaysAgoSeconds }),
    } as never);

    const { result } = renderHook(() => usePledgeAge(0), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.daysSinceLastPledge).toBe(20);
  });

  it("falls back to chunked scanning when the single wide-range request is rejected", async () => {
    mockNetworkReady();
    const getContractEvents = vi
      .fn()
      .mockRejectedValueOnce(new Error("block range too large"))
      .mockResolvedValueOnce([]) // most recent chunk: no hits
      .mockResolvedValueOnce([{ blockNumber: 500n }]); // older chunk: hit, stop here
    vi.mocked(usePublicClient).mockReturnValue({
      getBlockNumber: vi.fn().mockResolvedValue(20_000n),
      getContractEvents,
      getBlock: vi.fn().mockResolvedValue({ timestamp: PLEDGED_AT_SECONDS }),
    } as never);

    const { result } = renderHook(() => usePledgeAge(0), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lastPledgedAt).toBe(
      Number(PLEDGED_AT_SECONDS) * 1000,
    );
    // 1 failed wide-range attempt + 2 chunk attempts before stopping at the first hit.
    expect(getContractEvents).toHaveBeenCalledTimes(3);
  });

  it("stays disabled (never queries) when the network isn't ready to interact", () => {
    vi.mocked(useAccount).mockReturnValue({} as never);
    vi.mocked(useNetworkStatus).mockReturnValue({
      address: undefined,
      canInteract: false,
    } as never);
    const getBlockNumber = vi.fn();
    vi.mocked(usePublicClient).mockReturnValue({ getBlockNumber } as never);

    renderHook(() => usePledgeAge(0), { wrapper });
    expect(getBlockNumber).not.toHaveBeenCalled();
  });
});
