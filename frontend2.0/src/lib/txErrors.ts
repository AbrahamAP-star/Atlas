import { BaseError, ContractFunctionRevertedError, decodeErrorResult } from "viem";
import { crowdfundingAbi } from "@/contracts/crowdfundingConfig";

// Migrated 1:1 from frontend/src/lib/txErrors.ts (docs/08_FRONTEND_MIGRATION.md).
// Only change: import via the "@/contracts/crowdfundingConfig" alias.
//
// Translates Crowdfunding.sol's custom errors into messages for non-technical users.
export const errorMessages: Record<string, string> = {
  InvalidGoal: "The goal must be greater than 0.",
  ZeroPledge: "The pledge must be greater than 0.",
  ProjectNotFound: "The project doesn't exist.",
  ProjectClosed: "The project was already withdrawn by its creator, it no longer accepts pledges.",
  ProjectNotSuccessful: "The project hasn't reached the minimum goal for withdrawal yet.",
  NotProjectCreator: "Only the creator can claim the funds.",
  AlreadyClaimed: "The funds have already been claimed.",
  NoFundsToRefund: "You don't have any funds to refund on this project.",
  ProjectHasActiveFunds: "You can't delete this project: it still has unclaimed pledges. Backers must refund themselves first, or you must claim the funds.",
  TransferFailed: "The transfer failed, please try again.",
  ReentrancyGuardReentrantCall: "Operation blocked for security reasons, please try again.",
  SafeCastOverflowedUintDowncast: "The amount is too large to process.",
};

/** Readable message from a SEND error (wallet rejection, prior simulation) —
 *  it doesn't carry re-simulatable revert bytes, so it's used as-is from viem. */
export function toReadableError(error: unknown): string {
  if (error instanceof BaseError) {
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && errorMessages[name]) return errorMessages[name];
    }
    return error.shortMessage ?? "An unexpected error occurred.";
  }
  return "An unexpected error occurred.";
}

/** Extracts the custom error's name from the result of a failed eth_call
 *  (replay of an already-mined, reverted tx, see TxTrackerContext). */
export function extractErrorName(callError: unknown): string | undefined {
  if (!(callError instanceof BaseError)) return undefined;
  const revert = callError.walk((e) => e instanceof ContractFunctionRevertedError);
  if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName) {
    return revert.data.errorName;
  }
  const raw = (callError.walk((e) => "data" in (e as { data?: unknown })) as { data?: unknown } | null)?.data;
  if (typeof raw === "string" && raw.startsWith("0x") && raw.length > 2) {
    try {
      return decodeErrorResult({ abi: crowdfundingAbi, data: raw as `0x${string}` }).errorName;
    } catch {
      return undefined; // the revert bytes don't match any error in this ABI
    }
  }
  return undefined;
}
