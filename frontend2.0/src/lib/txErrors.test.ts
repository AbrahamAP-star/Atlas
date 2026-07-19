import { describe, it, expect } from "vitest";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { toReadableError } from "./txErrors";

// Builds a BaseError whose .walk() resolves to a ContractFunctionRevertedError
// with the given custom error name, mirroring what viem produces on revert.
function revertError(errorName: string): BaseError {
  const revert = Object.create(ContractFunctionRevertedError.prototype) as ContractFunctionRevertedError;
  Object.assign(revert, { data: { errorName } });

  const base = Object.create(BaseError.prototype) as BaseError;
  Object.assign(base, {
    shortMessage: "execution reverted",
    walk: (fn?: (e: unknown) => boolean) => (!fn || fn(revert) ? revert : null),
  });
  return base;
}

describe("toReadableError", () => {
  it("translates a known custom error to its Spanish-free, non-technical message", () => {
    expect(toReadableError(revertError("ZeroPledge"))).toBe("The pledge must be greater than 0.");
  });

  it("falls back to the wallet's shortMessage for an unmapped error name", () => {
    expect(toReadableError(revertError("SomeUnmappedError"))).toBe("execution reverted");
  });

  it("returns a generic message for a non-BaseError value", () => {
    expect(toReadableError(new Error("boom"))).toBe("An unexpected error occurred.");
    expect(toReadableError(undefined)).toBe("An unexpected error occurred.");
  });
});
