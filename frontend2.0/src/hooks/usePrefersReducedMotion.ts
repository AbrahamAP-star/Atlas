import { useEffect, useState } from "react";

// Migrated 1:1 from frontend/src/hooks/usePrefersReducedMotion.ts (docs/08_FRONTEND_MIGRATION.md).

const QUERY = "(prefers-reduced-motion: reduce)";

// Reads the OS preference once on mount and subscribes to real-time changes
// (the user can toggle it without reloading the page).
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
