// Migrated 1:1 from frontend/src/lib/documentText.ts (docs/08_FRONTEND_MIGRATION.md).
// pdfjs-dist is imported DYNAMICALLY (not at module level) because its
// internal code (canvas.js) references DOMMatrix, a browser API that doesn't
// exist in TanStack Start's server render. A static import is evaluated
// whenever this file is imported (even in SSR); a dynamic one only runs when
// this function is called, i.e. on the client, triggered by the user picking a file.
function isTextItem(item: unknown): item is { str: string } {
  return typeof (item as { str?: unknown })?.str === "string";
}

/**
 * Extracts the full text from an attached file (.txt or .pdf) so it can be
 * shown and edited inside the "Description" textarea.
 *
 * No length limit on purpose (explicit request from Abraham, 2026-07-16):
 * the full content, whether short or long, should always be passed to the
 * textarea so the end user can read/edit it, instead of just seeing
 * "a file was uploaded" with no way to review what it says.
 *
 * Returns `undefined` if the file has no extractable text (e.g. a PDF
 * scanned as an image, with no real text layer) - in that case the file
 * still gets uploaded as an attachment, just without a reflection in Description.
 */
export async function extractTextFromFile(
  file: File,
): Promise<string | undefined> {
  if (file.type === "text/plain") {
    const text = await file.text();
    return text.length > 0 ? text : undefined;
  }

  if (file.type === "application/pdf") {
    // Dynamic import + worker configuration only here, never in SSR
    // (see header comment). The ES module cache avoids reloading
    // pdfjs-dist on subsequent calls within the same session.
    const pdfjsLib = await import("pdfjs-dist");
    const pdfWorkerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url"))
      .default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      // Each text item is a fragment (line/word depending on how the PDF
      // encoded the content); joining them with a space preserves readability.
      const pageText = content.items
        .filter(isTextItem)
        .map((item) => item.str)
        .join(" ");
      pageTexts.push(pageText.trim());
    }
    const text = pageTexts.join("\n\n").trim();
    return text.length > 0 ? text : undefined;
  }

  return undefined;
}
