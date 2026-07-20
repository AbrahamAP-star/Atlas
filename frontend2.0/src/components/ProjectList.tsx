import { useProjects } from "@/hooks/useProjects";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ProjectCard } from "./ProjectCard";

// Migrated 1:1 from frontend/src/components/ProjectList.tsx (docs/08_FRONTEND_MIGRATION.md).

interface Props {
  onSelect: (id: number) => void;
}

export function ProjectList({ onSelect }: Props) {
  const { projects, isLoading } = useProjects();
  const network = useNetworkStatus();

  if (network.kind === "unsupported-chain") {
    return (
      <p className="error-state">
        Sorry, this network isn't supported. Switch to:{" "}
        {network.supportedChainNames.join(", ")}.
      </p>
    );
  }
  if (network.kind === "not-deployed") {
    return (
      <p className="error-state">
        The contract isn't deployed on this network yet. Switch to:{" "}
        {network.deployedChainNames.join(", ")}.
      </p>
    );
  }
  if (isLoading) return <p className="empty-state">Loading projects…</p>;
  if (projects.length === 0)
    return <p className="empty-state">No projects have been created yet.</p>;

  return (
    <div className="project-grid">
      {projects.map(({ id, project }) => (
        <ProjectCard key={id} id={id} project={project} onSelect={onSelect} />
      ))}
    </div>
  );
}
