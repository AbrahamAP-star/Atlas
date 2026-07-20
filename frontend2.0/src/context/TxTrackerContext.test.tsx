import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { TxTrackerProvider, useTxTracker } from "./TxTrackerContext";

// Deliberately mocked instead of using a real receipt/eth_call: this suite's
// job is proving TxTrackerContext's OWN lifecycle logic (survives
// unmount, persists/rehydrates), not re-testing wagmi or viem's decoding.
const mockReceipt = vi.fn();
const mockPublicClient = {
  getTransaction: vi
    .fn()
    .mockResolvedValue({ from: "0x1", to: "0x2", input: "0x", value: 0n }),
  call: vi.fn().mockResolvedValue({}),
};

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useWaitForTransactionReceipt: (...args: unknown[]) => mockReceipt(...args),
    usePublicClient: () => mockPublicClient,
  };
});

// Error-name decoding is txErrors.ts's own job (already unit-tested there);
// stubbed here so this suite only exercises TxTrackerContext's wiring.
vi.mock("@/lib/txErrors", () => ({
  errorMessages: {
    ProjectClosed: "The project was already withdrawn by its creator.",
  },
  toReadableError: vi.fn(() => "An unexpected error occurred."),
  extractErrorName: vi.fn(),
}));

import { extractErrorName } from "@/lib/txErrors";

const HASH =
  "0xaaaa000000000000000000000000000000000000000000000000000000aa" as const;

/** Registers `hash` and renders its live status — stands in for a
 *  PledgeForm/CreateProjectForm that fires a tx and shows its result. */
function Consumer({ hash }: { hash: `0x${string}` }) {
  const { track, getTx } = useTxTracker();
  useEffect(() => {
    track(hash);
  }, [hash, track]);
  const tx = getTx(hash);
  return (
    <>
      <div data-testid="status">{tx?.status ?? "none"}</div>
      <div data-testid="error">{tx?.errorMessage ?? ""}</div>
    </>
  );
}

/** Only reads, never calls track() — used to prove a hash was already
 *  known to the provider before this component ever mounted (rehydration). */
function Reader({ hash }: { hash: `0x${string}` }) {
  const { getTx } = useTxTracker();
  return <div data-testid="status">{getTx(hash)?.status ?? "none"}</div>;
}

beforeEach(() => {
  localStorage.clear();
  mockReceipt.mockReset();
  mockPublicClient.call.mockReset().mockResolvedValue({});
  vi.mocked(extractErrorName).mockReset();
});

describe("TxTrackerProvider", () => {
  it("tracks a hash through confirming -> success", async () => {
    mockReceipt.mockReturnValue({
      isLoading: true,
      isSuccess: false,
      error: undefined,
    });
    const { rerender } = render(
      <TxTrackerProvider>
        <Consumer hash={HASH} />
      </TxTrackerProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("confirming"),
    );

    mockReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
      error: undefined,
    });
    rerender(
      <TxTrackerProvider>
        <Consumer hash={HASH} />
      </TxTrackerProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("success"),
    );
  });

  it("keeps resolving a tx after the component that sent it unmounts (the lifecycle bug this provider fixes)", async () => {
    mockReceipt.mockReturnValue({
      isLoading: true,
      isSuccess: false,
      error: undefined,
    });
    const { rerender } = render(
      <TxTrackerProvider>
        <Consumer hash={HASH} />
      </TxTrackerProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("confirming"),
    );

    // The view/form that sent the tx unmounts (e.g. user navigates away).
    // TxTrackerProvider itself (mounted once in main.tsx) stays alive.
    rerender(<TxTrackerProvider>{null}</TxTrackerProvider>);

    // The chain confirms while nothing in the UI is watching this hash.
    mockReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
      error: undefined,
    });
    rerender(<TxTrackerProvider>{null}</TxTrackerProvider>);

    // A fresh consumer mounts later (e.g. navigating back) and must see the
    // already-resolved result without calling track() again itself mattering.
    rerender(
      <TxTrackerProvider>
        <Consumer hash={HASH} />
      </TxTrackerProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("success"),
    );
  });

  it("persists unresolved hashes to localStorage and drops them once resolved", async () => {
    mockReceipt.mockReturnValue({
      isLoading: true,
      isSuccess: false,
      error: undefined,
    });
    const { rerender } = render(
      <TxTrackerProvider>
        <Consumer hash={HASH} />
      </TxTrackerProvider>,
    );
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("cf-tracked-txs") ?? "[]"),
      ).toEqual([HASH]),
    );

    mockReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
      error: undefined,
    });
    rerender(
      <TxTrackerProvider>
        <Consumer hash={HASH} />
      </TxTrackerProvider>,
    );
    // A resolved tx doesn't need to survive a reload: its result was already shown.
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("cf-tracked-txs") ?? "[]"),
      ).toEqual([]),
    );
  });

  it("rehydrates a pending hash from localStorage on mount, without any component calling track() again", () => {
    localStorage.setItem("cf-tracked-txs", JSON.stringify([HASH]));
    mockReceipt.mockReturnValue({
      isLoading: true,
      isSuccess: false,
      error: undefined,
    });

    render(
      <TxTrackerProvider>
        <Reader hash={HASH} />
      </TxTrackerProvider>,
    );

    // Reader never calls track(): the only way it can know this hash is if
    // TxTrackerProvider's useState initializer read it back from localStorage.
    expect(screen.getByTestId("status")).not.toHaveTextContent("none");
  });

  it("resolves to a readable error via eth_call replay when the mined receipt reverted", async () => {
    vi.mocked(extractErrorName).mockReturnValue("ProjectClosed");
    mockPublicClient.call.mockRejectedValue(new Error("reverted"));
    mockReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      error: new Error("reverted"),
    });

    render(
      <TxTrackerProvider>
        <Consumer hash={HASH} />
      </TxTrackerProvider>,
    );

    // Fixed bug found while writing this test: TxWatcher used to resolve
    // "error" in two passes (generic message first, decoded name later),
    // which unmounted itself after the first pass and lost the second before
    // the real network round-trip finished. Now it resolves exactly once, so
    // waiting for the final message is enough.
    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "The project was already withdrawn by its creator.",
      ),
    );
    expect(screen.getByTestId("status")).toHaveTextContent("error");
  });
});
