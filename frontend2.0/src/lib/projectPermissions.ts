// Pure permission checks mirroring Crowdfunding.sol's revert conditions 1:1
// (see 02_SMART_CONTRACT_SPEC.md). Extracted from ProjectDetail.tsx so this
// logic — which already caused a real bug (canClaim/canRefund tied to a
// phantom `isExpired`, see 04_STATUS.md) — is unit-testable without mounting
// the component or mocking wagmi.

export function canPledgeProject(claimed: boolean): boolean {
  return !claimed;
}

export function canClaimProject(params: {
  canInteract: boolean;
  isCreator: boolean;
  isSuccessful: boolean;
  claimed: boolean;
}): boolean {
  return params.canInteract && params.isCreator && params.isSuccessful && !params.claimed;
}

export function canRefundProject(params: { canInteract: boolean; claimed: boolean; myPledge: bigint }): boolean {
  return params.canInteract && !params.claimed && params.myPledge > 0n;
}

export function canDeleteProject(params: {
  canInteract: boolean;
  isCreator: boolean;
  claimed: boolean;
  pledged: bigint;
}): boolean {
  return params.canInteract && params.isCreator && (params.claimed || params.pledged === 0n);
}
