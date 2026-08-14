// Pure logic for the "stale pledge" banner (docs/09_ROADMAP_MEJORAS.md § 14,
// Option A, decided by Abraham/Claudio 2026-08-04). Kept separate from the
// component so the threshold rule is unit-testable without mounting React
// or mocking wagmi — same pattern already used for lib/projectPermissions.ts
// (extracted after a real integration bug there, see 04_STATUS.md).

/**
 * Crowdfunding.sol has no `deadline` (02_SMART_CONTRACT_SPEC.md): a project
 * keeps accepting pledges forever until the creator claims or deletes it.
 * That's correct on-chain (refund always works, nothing is ever stuck), but
 * it means a backer can simply forget they pledged if nothing nudges them.
 * This constant is the only thing that changes if that "nudge" window needs
 * tuning — same pattern as backend/src/config.ts's MAX_UPLOADS_PER_IP_PER_DAY.
 */
export const STALE_PLEDGE_THRESHOLD_DAYS = 30;

/**
 * Decides whether to show the "no recent activity" banner. This is PURELY
 * informational — it never gates pledge/refund/claim, which are the
 * contract's own authority (lib/projectPermissions.ts). A project can be
 * "stale" by this definition and still be perfectly safe: the backer's
 * refund path never depends on this flag.
 */
export function shouldShowStalePledgeBanner(params: {
  claimed: boolean;
  daysSinceLastPledge: number | undefined;
}): boolean {
  // Claimed = the project's lifecycle already ended; staleness before that
  // point is no longer actionable information for anyone.
  if (params.claimed) return false;
  // undefined covers two different real cases on purpose, both of which
  // should stay silent rather than show a possibly-wrong banner:
  //   1. the project has never received a pledge yet (nothing "went quiet"),
  //   2. the log read failed/timed out (usePledgeAge degrades gracefully).
  if (params.daysSinceLastPledge === undefined) return false;
  return params.daysSinceLastPledge >= STALE_PLEDGE_THRESHOLD_DAYS;
}
