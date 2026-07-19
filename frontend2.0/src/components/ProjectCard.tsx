import { formatEther } from "viem";
import type { Project } from "@/hooks/useProjects";
import { useProjectMetadata } from "@/hooks/useProjectMetadata";
import { getProjectStatus } from "@/lib/projectStatusLabel";

// Migrated 1:1 from frontend/src/components/ProjectCard.tsx (docs/08_FRONTEND_MIGRATION.md).

interface Props {
  id: number;
  project: Project;
  onSelect: (id: number) => void;
}

export function ProjectCard({ id, project, onSelect }: Props) {
  const status = getProjectStatus(project);
  const pct = project.goal > 0n ? Number((project.pledged * 100n) / project.goal) : 0;
  const { metadata, imageUrl } = useProjectMetadata(project.metadataCID);

  return (
    <button className="project-card" onClick={() => onSelect(id)}>
      {/* Placeholder with the title's initial while loading/if there's no image:
          avoids the layout shift of an empty <img> and visually ties in
          with the real title instead of showing a generic gray gap. */}
      <div className="project-card-media">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="project-card-media-fallback" aria-hidden="true">
            {(metadata?.title ?? "P").charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span className={`status-pill ${status.className}`}>{status.label}</span>
      <h3>{metadata?.title ?? `Project #${id}`}</h3>
      <div className="progress-track">
        <div
          className={`progress-fill ${status.className === "ok" ? "success" : ""}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span>
        {formatEther(project.pledged)} / {formatEther(project.goal)} ETH
      </span>
    </button>
  );
}
