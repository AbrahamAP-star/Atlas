import type { Project } from "@/hooks/useProjects";

// Derives the visual state from `pledged`/`goal`/`claimed`, without
// duplicating the contract's logic (isSuccessful is read-only). There's no
// more "Not reached" (failed) state: with no deadline, a project never
// "expires"; it only closes once the creator withdraws (`claimed`).
export function getProjectStatus(project: Pick<Project, "claimed" | "pledged" | "goal">): {
  label: string;
  className: string;
} {
  if (project.claimed) return { label: "Withdrawn", className: "ok" };
  if (project.pledged >= project.goal) return { label: "Goal reached", className: "ok" };
  return { label: "In progress", className: "pending" };
}
