import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTxStatus } from "./useTxStatus";

// TxTrackerContext's own lifecycle logic is covered in
// context/TxTrackerContext.test.tsx — this file only checks that the
// adapter reads/writes the context correctly.
vi.mock("@/context/TxTrackerContext", () => ({ useTxTracker: vi.fn() }));
vi.mock("@/lib/txErrors", () => ({
  toReadableError: vi.fn(() => "Wallet rejected the transaction."),
}));

import { useTxTracker } from "@/context/TxTrackerContext";

const HASH =
  "0xaaaa000000000000000000000000000000000000000000000000000000aa" as const;

describe("useTxStatus", () => {
  it("returns idle with no hash and no write error", () => {
    vi.mocked(useTxTracker).mockReturnValue({
      track: vi.fn(),
      getTx: vi.fn(),
    } as never);
    const { result } = renderHook(() => useTxStatus(undefined, undefined));
    expect(result.current).toEqual({ status: "idle", errorMessage: undefined });
  });

  it("prioritizes a local write error (wallet rejection) over any tracked state", () => {
    // A write error happens before a hash even exists — it must win
    // regardless of what the tracker knows about this hash.
    vi.mocked(useTxTracker).mockReturnValue({
      track: vi.fn(),
      getTx: vi.fn(() => ({ hash: HASH, status: "success" as const })),
    } as never);
    const { result } = renderHook(() =>
      useTxStatus(HASH, new Error("User rejected")),
    );
    expect(result.current).toEqual({
      status: "error",
      errorMessage: "Wallet rejected the transaction.",
    });
  });

  it("registers the hash with the tracker as soon as it appears", () => {
    const track = vi.fn();
    vi.mocked(useTxTracker).mockReturnValue({
      track,
      getTx: vi.fn(() => undefined),
    } as never);
    renderHook(() => useTxStatus(HASH, undefined));
    expect(track).toHaveBeenCalledWith(HASH);
  });

  it("reflects 'confirming' while the hash exists but the tracker hasn't resolved it yet", () => {
    vi.mocked(useTxTracker).mockReturnValue({
      track: vi.fn(),
      getTx: vi.fn(() => undefined),
    } as never);
    const { result } = renderHook(() => useTxStatus(HASH, undefined));
    expect(result.current.status).toBe("confirming");
  });

  it("passes through the tracker's resolved status/errorMessage", () => {
    vi.mocked(useTxTracker).mockReturnValue({
      track: vi.fn(),
      getTx: vi.fn(() => ({
        hash: HASH,
        status: "error" as const,
        errorMessage: "The project doesn't exist.",
      })),
    } as never);
    const { result } = renderHook(() => useTxStatus(HASH, undefined));
    expect(result.current).toEqual({
      status: "error",
      errorMessage: "The project doesn't exist.",
    });
  });
});
