import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectCard } from "./ProjectCard";
import type { Project } from "@/hooks/useProjects";

// Mocked so the DOM assertions don't depend on a real IPFS fetch/react-query cache.
vi.mock("@/hooks/useProjectMetadata", () => ({
  useProjectMetadata: vi.fn(),
}));

import { useProjectMetadata } from "@/hooks/useProjectMetadata";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    creator: "0x1111111111111111111111111111111111111111",
    goal: 100n,
    pledged: 50n,
    claimed: false,
    metadataCID: "bafy123",
    ...overrides,
  };
}

describe("ProjectCard", () => {
  it("renders the real title/image once metadata resolves", () => {
    vi.mocked(useProjectMetadata).mockReturnValue({
      metadata: { title: "Solar Farm", description: "" },
      imageUrl: "https://gateway.pinata.cloud/ipfs/img123",
      documentUrl: undefined,
      isLoading: false,
      error: null,
    } as never);

    const { container } = render(
      <ProjectCard id={0} project={makeProject()} onSelect={vi.fn()} />,
    );

    expect(screen.getByText("Solar Farm")).toBeInTheDocument();
    // alt="" is intentional (decorative image, the title already describes
    // it) but that's exactly what strips the "img" role from the a11y tree —
    // querying the DOM node directly instead of getByRole("img").
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://gateway.pinata.cloud/ipfs/img123",
    );
  });

  it("falls back to the title's initial and a placeholder id while metadata hasn't loaded", () => {
    vi.mocked(useProjectMetadata).mockReturnValue({
      metadata: undefined,
      imageUrl: undefined,
      documentUrl: undefined,
      isLoading: true,
      error: null,
    } as never);

    render(<ProjectCard id={7} project={makeProject()} onSelect={vi.fn()} />);

    expect(screen.getByText("Project #7")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the 'Withdrawn' status pill once the creator has claimed", () => {
    vi.mocked(useProjectMetadata).mockReturnValue({
      metadata: undefined,
      imageUrl: undefined,
      documentUrl: undefined,
      isLoading: false,
      error: null,
    } as never);

    render(
      <ProjectCard
        id={1}
        project={makeProject({ claimed: true })}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
  });

  it("calls onSelect with the project id when clicked", () => {
    vi.mocked(useProjectMetadata).mockReturnValue({
      metadata: undefined,
      imageUrl: undefined,
      documentUrl: undefined,
      isLoading: false,
      error: null,
    } as never);
    const onSelect = vi.fn();

    render(<ProjectCard id={3} project={makeProject()} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledWith(3);
  });
});
