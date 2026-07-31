import { useEffect, useRef, useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePinataUpload } from "@/hooks/usePinataUpload";
import { useCreateProject } from "@/hooks/useCreateProject";
import { TransactionStatus } from "./TransactionStatus";
import { ContractRiskNotice } from "./ContractRiskNotice";
import { playBackSound, playSuccessSound } from "@/lib/sounds";
import { extractTextFromFile } from "@/lib/documentText";

// Migrated 1:1 from frontend/src/components/CreateProjectForm.tsx (docs/08_FRONTEND_MIGRATION.md).

// Accepted MIME types for the campaign's attached document: text/PDF only,
// never images (that's already covered by the separate "Image" input).
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "text/plain"];
// Reasonable limit to avoid saturating the Pinata quota with a huge file.
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateProjectForm({ onCreated, onCancel }: Props) {
  const network = useNetworkStatus();
  const { address } = network;
  const { isConnected } = useAccount();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | undefined>();
  // Renamed from `document` to `attachmentFile`: using `document` as a state
  // name would shadow the global DOM `document` throughout this whole
  // component — a latent bug if `document.*` is ever needed here.
  const [attachmentFile, setAttachmentFile] = useState<File | undefined>();
  const [documentError, setDocumentError] = useState<string | undefined>();
  const [documentPreview, setDocumentPreview] = useState<string | undefined>();
  // While text is being extracted (especially a large PDF, which runs on a
  // Web Worker) submission is blocked, to avoid uploading a half-finished
  // `description` to IPFS while the attachment block is still being built.
  const [isExtractingText, setIsExtractingText] = useState(false);
  // Stores the exact block (delimiters included) we last inserted into
  // `description`, so it can be removed later without touching the rest of
  // what the user may have typed by hand. A ref (not state) because it must
  // not trigger a re-render by itself, it's only read/written from effects.
  const insertedBlockRef = useRef<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  // "Goal" is no longer the target of a campaign with a deadline: it's the
  // MINIMUM amount that, once reached, lets the creator withdraw whenever
  // they decide. The project keeps receiving pledges after reaching it,
  // until it's withdrawn.
  const [goalEth, setGoalEth] = useState("");

  const { upload, isUploading, error: uploadError } = usePinataUpload();
  const { createProject, status, errorMessage, hash } =
    useCreateProject(address);

  useEffect(() => {
    if (status === "success") {
      // Success sound only here (project creation confirmed on-chain), not
      // on pledge/claim/refund: those weren't requested by Abraham.
      playSuccessSound();
      onCreated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Validation logic shared between the <input type="file"> (click) and the
  // drag-and-drop drop: both paths must accept/reject the same way. The
  // input's `accept` attribute or the type reported by the drag only filter
  // at the OS/browser level, they never guarantee it, so the File's real
  // MIME type is revalidated before accepting it, the same way it would be
  // validated on a backend.
  function processDocumentFile(file: File | undefined) {
    if (!file) {
      setAttachmentFile(undefined);
      setDocumentError(undefined);
      return;
    }
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      setAttachmentFile(undefined);
      setDocumentError("Only PDF or text files are allowed (.pdf, .txt).");
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setAttachmentFile(undefined);
      setDocumentError("The file exceeds the 10 MB limit.");
      return;
    }
    setAttachmentFile(file);
    setDocumentError(undefined);
  }

  function handleDocumentChange(e: React.ChangeEvent<HTMLInputElement>) {
    processDocumentFile(e.target.files?.[0]);
  }

  function handleDocumentDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    processDocumentFile(e.dataTransfer.files?.[0]);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); // needed so the browser allows the drop
    setIsDragOver(true);
  }

  function clearDocument() {
    setAttachmentFile(undefined);
    setDocumentError(undefined);
    setDocumentPreview(undefined);
    // Direct, synchronous removal of the block inserted into Description:
    // not left to the effect that reacts to `documentPreview` (that effect
    // still exists for the file-replacement case), so the "Remove" button
    // clears the card and the text in the same click, without depending on
    // a second render pass.
    removeInsertedBlock();
    // Safe reference to `window.document` (the real DOM): only possible
    // because the local state is no longer called `document` and doesn't
    // shadow it.
    const input = window.document.getElementById(
      "document-upload",
    ) as HTMLInputElement | null;
    if (input) input.value = "";
  }

  // Extracts the attachment's text (.txt directly, .pdf via pdf.js) with NO
  // length limit: the explicit request is that the full content, long or
  // short, always flows into the Description textarea so it can be
  // read/edited (see lib/documentText.ts). A scanned PDF with no real text
  // falls back to `undefined` and simply isn't reflected in Description
  // (the file still gets uploaded either way).
  useEffect(() => {
    if (!attachmentFile) {
      setDocumentPreview(undefined);
      return;
    }
    let cancelled = false;
    setIsExtractingText(true);
    extractTextFromFile(attachmentFile)
      .then((text) => {
        if (!cancelled) setDocumentPreview(text);
      })
      .catch(() => {
        if (!cancelled) setDocumentPreview(undefined);
      })
      .finally(() => {
        if (!cancelled) setIsExtractingText(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attachmentFile]);

  // Removes, exactly, the last block we inserted for an attached document
  // (if any) from the Description textarea. Centralized here because it's
  // needed from two places: the direct click on "Remove" and the effect
  // that detects the attached file no longer has text (it was removed or
  // replaced by a PDF).
  function removeInsertedBlock() {
    if (!insertedBlockRef.current) return;
    const block = insertedBlockRef.current;
    insertedBlockRef.current = "";
    setDescription((current) => current.replace(block, ""));
  }

  // Reflects the attached .txt content INSIDE the Description textarea,
  // instead of only showing it in a separate preview box. It's inserted as
  // a delimited block and remembered in `insertedBlockRef` so it can be
  // cleanly removed if the file changes (manual removal via the button is
  // already handled directly by `clearDocument`; this covers the
  // replacement case).
  useEffect(() => {
    if (documentPreview === undefined) {
      removeInsertedBlock();
      return;
    }
    setDescription((current) => {
      const withoutPrevious = insertedBlockRef.current
        ? current.replace(insertedBlockRef.current, "")
        : current;
      const block = `\n\n--- Attached document: ${attachmentFile?.name ?? ""} ---\n${documentPreview}\n--- End of attached document ---`;
      insertedBlockRef.current = block;
      return `${withoutPrevious}${block}`;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentPreview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !goalEth) return;

    const cid = await upload(title, description, image, attachmentFile);
    if (!cid) return;

    createProject(parseEther(goalEth), cid);
  }

  const isBusy =
    isUploading ||
    isExtractingText ||
    status === "pending" ||
    status === "confirming";

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <h2>Create project</h2>
      <ContractRiskNotice variant="create" />
      {network.kind === "unsupported-chain" && (
        <p className="error-state">
          Unsupported network. Switch to:{" "}
          {network.supportedChainNames.join(", ")}.
        </p>
      )}
      {network.kind === "not-deployed" && (
        <p className="error-state">
          This network doesn't have the contract deployed yet. Switch to:{" "}
          {network.deployedChainNames.join(", ")}.
        </p>
      )}

      {/* Field title moved "inside" the input via placeholder (low opacity
          but legible, see ::placeholder in styles.css) instead of a separate
          text line above it — saves a full row per field. The
          <span className="sr-only"> keeps the label accessible. */}
      <label className="field-title">
        <span className="sr-only">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
      </label>
      <label className="field-goal">
        <span className="sr-only">Minimum goal to allow withdrawal (ETH)</span>
        <input
          type="number"
          step="0.0001"
          min="0"
          value={goalEth}
          onChange={(e) => setGoalEth(e.target.value)}
          placeholder="Minimum goal (ETH)"
          required
        />
      </label>
      <label className="field-description">
        <span className="sr-only">Description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          required
        />
      </label>
      {/* Separate block (not nested inside a <label>): a <label> inside
          another <label> is invalid HTML and made the file button's click
          resolve ambiguously against the textarea, which is why the input
          wouldn't open. */}
      <div
        className={`file-field field-document${isDragOver ? " is-drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDocumentDrop}
      >
        <span className="file-field-hint">
          Document (PDF/.txt, optional) — drag it here
        </span>
        <input
          type="file"
          id="document-upload"
          className="file-input-hidden"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={handleDocumentChange}
        />
        <label
          htmlFor="document-upload"
          className="secondary file-select-button"
        >
          📎 Attach document
        </label>
        {/* A single attachment card for both PDF and .txt: for .txt, its
            content is already reflected inside the Description textarea
            (see the effect that builds `insertedBlockRef`), so repeating it
            here in a separate preview box was duplicated logic and UI. */}
        {attachmentFile && (
          <div className="file-attachment-card">
            <span aria-hidden="true">📄</span>
            <span className="file-attachment-name">{attachmentFile.name}</span>
            <span className="file-attachment-size">
              {formatFileSize(attachmentFile.size)}
            </span>
            <button type="button" className="secondary" onClick={clearDocument}>
              Remove
            </button>
          </div>
        )}
        {documentError && <p className="error-state">{documentError}</p>}
      </div>
      {/* Same box as the document (.file-field): hint + button + selected
          file name, so both file fields look consistent and take up the
          same space within the form. */}
      <div className="file-field field-image">
        <span className="file-field-hint">Cover image (optional)</span>
        <input
          type="file"
          id="image-upload"
          className="file-input-hidden"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0])}
        />
        <label htmlFor="image-upload" className="secondary file-select-button">
          🖼️ Upload image
        </label>
        {image && <span className="file-selected-name">{image.name}</span>}
      </div>
      {/* No duration field: the project stays open to receiving pledges
          indefinitely. Once this goal is reached, the creator can withdraw
          whenever they want from ProjectDetail; until then, and even
          afterward if they still haven't withdrawn, the project keeps
          accepting pledges. */}
      <p className="field-hint">
        No closing date: it keeps receiving pledges until you withdraw the
        funds.
      </p>

      <div className="action-block">
        <button
          type="submit"
          disabled={!isConnected || !network.canInteract || isBusy}
        >
          {isUploading
            ? "Uploading to IPFS…"
            : isExtractingText
              ? "Reading file…"
              : "Create project"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            playBackSound();
            onCancel();
          }}
          disabled={isBusy}
        >
          Cancel
        </button>
      </div>

      {uploadError && <p className="error-state">{uploadError}</p>}
      <TransactionStatus
        status={status}
        errorMessage={errorMessage}
        hash={hash}
      />
    </form>
  );
}
