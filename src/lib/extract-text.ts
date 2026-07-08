// Extract plain text from an uploaded resume (PDF, DOCX, or TXT).

/** Extract text from a PDF buffer using unpdf (serverless-friendly pdf.js). */
async function fromPdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

/** Extract text from a DOCX buffer using mammoth. */
async function fromDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.extractRawText({
    buffer: Buffer.from(buffer),
  });
  return value;
}

/**
 * Detect the file type from name/mime and extract its text content.
 * Throws for unsupported types.
 */
export async function extractResumeText(
  buffer: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<string> {
  const name = filename.toLowerCase();
  if (name.endsWith(".pdf") || mime === "application/pdf") {
    return (await fromPdf(buffer)).trim();
  }
  if (
    name.endsWith(".docx") ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return (await fromDocx(buffer)).trim();
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || mime.startsWith("text/")) {
    return new TextDecoder().decode(buffer).trim();
  }
  throw new Error(
    "Unsupported file type. Please upload a PDF, DOCX, or TXT resume.",
  );
}
