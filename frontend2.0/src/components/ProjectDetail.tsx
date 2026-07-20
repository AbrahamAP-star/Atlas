import { useEffect } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useProject } from "@/hooks/useProjects";
import { useProjectMetadata } from "@/hooks/useProjectMetadata";
import { useProjectStatus } from "@/hooks/useProjectStatus";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useClaimFunds } from "@/hooks/useClaimFunds";
import { useRefund } from "@/hooks/useRefund";
import { useDeleteProject } from "@/hooks/useDeleteProject";
import { PledgeForm } from "./PledgeForm";
import { TransactionStatus } from "./TransactionStatus";
import { playBackSound, playDeleteSound } from "@/lib/sounds";
import {
  canPledgeProject,
  canClaimProject,
  canRefundProject,
  canDeleteProject,
} from "@/lib/projectPermissions";

// Migrated 1:1 from frontend/src/components/ProjectDetail.tsx (docs/08_FRONTEND_MIGRATION.md).

interface Props {
  id: number;
  onBack: () => void;
}

export function ProjectDetail({ id, onBack }: Props) {
  const { project, isLoading, error, refetch: refetchProject } = useProject(id);
  const { metadata, imageUrl, documentUrl } = useProjectMetadata(
    project?.metadataCID,
  );
  const { address: account } = useAccount();
  const network = useNetworkStatus();
  const projectStatus = useProjectStatus(id);
  const claim = useClaimFunds(projectStatus.address);
  const refund = useRefund(projectStatus.address);
  const deleteProjectTx = useDeleteProject(projectStatus.address);

  function refreshAll() {
    projectStatus.refetch();
    refetchProject();
  }

  // Refreshes goal/pledged/status after confirming a claim or refund.
  useEffect(() => {
    if (claim.status === "success" || refund.status === "success") refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim.status, refund.status]);

  // The project stops existing after it's deleted: go back to the listing
  // instead of refreshing (refreshing would show an empty struct, confusing for the user).
  useEffect(() => {
    if (deleteProjectTx.status === "success") {
      playDeleteSound();
      onBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteProjectTx.status]);

  if (isLoading) return <p className="empty-state">Loading project…</p>;
  if (error || !project)
    return <p className="error-state">Project #{id} was not found.</p>;

  const pct =
    project.goal > 0n ? Number((project.pledged * 100n) / project.goal) : 0;

  const isCreator =
    !!account && account.toLowerCase() === project.creator.toLowerCase();
  // Permission logic lives in lib/projectPermissions.ts (unit-tested) since
  // this exact spot already caused a real bug (isExpired fantasma).
  const canPledge = canPledgeProject(project.claimed);
  const canClaim = canClaimProject({
    canInteract: network.canInteract,
    isCreator,
    isSuccessful: projectStatus.isSuccessful,
    claimed: project.claimed,
  });
  const canRefund = canRefundProject({
    canInteract: network.canInteract,
    claimed: project.claimed,
    myPledge: projectStatus.myPledge,
  });
  const canDelete = canDeleteProject({
    canInteract: network.canInteract,
    isCreator,
    claimed: project.claimed,
    pledged: project.pledged,
  });

  return (
    <div className="detail-panel">
      <button
        className="secondary"
        onClick={() => {
          playBackSound();
          onBack();
        }}
      >
        ← Back
      </button>
      <h2>{metadata?.title ?? `Project #${id}`}</h2>
      {imageUrl && <img className="detail-image" src={imageUrl} alt="" />}
      {metadata?.description && (
        <p className="detail-description">{metadata.description}</p>
      )}
      <p>Creator: {project.creator}</p>
      <p>
        Raised: {formatEther(project.pledged)} ETH of{" "}
        {formatEther(project.goal)} ETH ({Math.min(pct, 100)}%)
      </p>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="field-hint">
        {project.claimed
          ? "This project was already withdrawn by its creator: it no longer accepts pledges."
          : "This project has no closing date: it stays open to receiving pledges, even after reaching the goal, until the creator decides to withdraw the funds."}
      </p>
      <p>
        Metadata:{" "}
        {/* Pinata gateway (not ipfs.io): content freshly pinned on the free plan
            can take a while to propagate to the public IPFS network, and
            generic gateways return 502 "no providers found" in the
            meantime. Pinata serves directly what it pinned itself. */}
        <a
          href={`https://gateway.pinata.cloud/ipfs/${project.metadataCID}`}
          target="_blank"
          rel="noreferrer"
        >
          view raw JSON
        </a>
        {documentUrl && (
          <>
            {" "}
            ·{" "}
            <a href={documentUrl} target="_blank" rel="noreferrer">
              view attached document
            </a>
          </>
        )}
      </p>

      {canPledge && (
        <PledgeForm
          id={id}
          address={projectStatus.address}
          disabled={!account || !network.canInteract}
          onConfirmed={refreshAll}
        />
      )}

      {canClaim && (
        <div className="action-block">
          <button
            onClick={() => claim.claimFunds(id)}
            disabled={
              claim.status === "pending" || claim.status === "confirming"
            }
          >
            Claim funds
          </button>
          <TransactionStatus
            status={claim.status}
            errorMessage={claim.errorMessage}
            hash={claim.hash}
          />
        </div>
      )}

      {canRefund && (
        <div className="action-block">
          <button
            onClick={() => refund.refund(id)}
            disabled={
              refund.status === "pending" || refund.status === "confirming"
            }
          >
            Request refund ({formatEther(projectStatus.myPledge)} ETH)
          </button>
          <TransactionStatus
            status={refund.status}
            errorMessage={refund.errorMessage}
            hash={refund.hash}
          />
        </div>
      )}

      {canDelete && (
        <div className="action-block">
          <button
            className="danger"
            onClick={() => {
              if (
                window.confirm(
                  "This action is irreversible. Delete this project?",
                )
              ) {
                deleteProjectTx.deleteProject(id);
              }
            }}
            disabled={
              deleteProjectTx.status === "pending" ||
              deleteProjectTx.status === "confirming"
            }
          >
            Delete project
          </button>
          <TransactionStatus
            status={deleteProjectTx.status}
            errorMessage={deleteProjectTx.errorMessage}
            hash={deleteProjectTx.hash}
          />
        </div>
      )}
    </div>
  );
}
