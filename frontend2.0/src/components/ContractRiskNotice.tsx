/**
 * ContractRiskNotice
 *
 * Persistent risk disclaimer shown wherever a user can move funds
 * (pledging or creating a project). This contract has NO pause/upgrade
 * mechanism by design (see docs/02_SMART_CONTRACT_SPEC.md — "no admin
 * can permanently block withdrawals"), which is a deliberate security
 * choice, but it also means there is no way to freeze the contract if
 * a critical bug is found after mainnet deploy. Users should know that
 * up front, not find out during an incident.
 *
 * Reference: docs/10_INCIDENT_RUNBOOK.md (Option A of roadmap point 10).
 *
 * Usage:
 *   <ContractRiskNotice variant="pledge" />   // in ProjectDetail.tsx / PledgeForm.tsx
 *   <ContractRiskNotice variant="create" />   // in CreateProjectForm.tsx
 *
 * Dismissal is per-browser-session only (sessionStorage), not permanent —
 * this is a risk disclosure, not a one-time onboarding tooltip. It should
 * resurface on a new session so returning users aren't assumed to
 * remember it.
 */
import { useState } from "react";

type Variant = "pledge" | "create";

const COPY: Record<Variant, string> = {
  pledge:
    "This contract has no admin pause and cannot be upgraded. If a critical bug is ever found, your only protection is calling Refund yourself before the creator claims funds — no one can freeze or reverse transactions on your behalf.",
  create:
    "This contract has no admin pause and cannot be upgraded. If a critical bug is ever found after you launch, backers must be able to reach you to coordinate refunds — there is no way for the team to intervene on-chain.",
};

// One sessionStorage key per variant so dismissing one notice doesn't
// hide the other (a user might see "create" today and "pledge" next week).
function storageKey(variant: Variant) {
  return `contract-risk-notice-dismissed:${variant}`;
}

export function ContractRiskNotice({ variant }: { variant: Variant }) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false; // SSR guard, same pattern as wagmi.ts/TxTrackerContext
    return sessionStorage.getItem(storageKey(variant)) === "true";
  });

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey(variant), "true");
    }
  }

  return (
    <div className="risk-notice" role="note" aria-label="Smart contract risk disclosure">
      <span className="risk-notice__icon" aria-hidden="true">
        ⚠
      </span>
      <p className="risk-notice__text">{COPY[variant]}</p>
      <button
        type="button"
        className="risk-notice__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss this notice"
      >
        ×
      </button>
    </div>
  );
}
