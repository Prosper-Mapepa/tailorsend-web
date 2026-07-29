import { apiFetch } from "@/lib/auth-client";

export function downloadText(
  filename: string,
  text: string,
  type = "text/markdown",
) {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadPdfFromMarkdown(
  filename: string,
  title: string,
  markdown: string,
  kind: "resume" | "cover" = "resume",
) {
  const blob = await fetchPdfBlobFromMarkdown(filename, title, markdown, kind);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Generate a PDF blob via the tailor PDF API (no download). */
export async function fetchPdfBlobFromMarkdown(
  filename: string,
  title: string,
  markdown: string,
  kind: "resume" | "cover" = "resume",
): Promise<Blob> {
  const res = await apiFetch("/api/tailor/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, title, filename, kind }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "PDF generation failed.",
    );
  }
  return res.blob();
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Build resume/cover PDFs as base64 for the Chrome extension fill payload. */
export async function buildExtensionPdfAttachments(opts: {
  resumeMarkdown?: string;
  coverMarkdown?: string;
  companyName?: string;
  downloadSlug?: string;
}): Promise<{
  resumePdf?: { filename: string; base64: string; mimeType: string };
  coverPdf?: { filename: string; base64: string; mimeType: string };
}> {
  const company = opts.companyName?.trim() || "Application";
  const slug = opts.downloadSlug?.trim() || resumeSlug(opts.resumeMarkdown ?? "resume");
  const out: {
    resumePdf?: { filename: string; base64: string; mimeType: string };
    coverPdf?: { filename: string; base64: string; mimeType: string };
  } = {};

  if (opts.resumeMarkdown?.trim()) {
    const filename = `resume-${slug}.pdf`;
    const blob = await fetchPdfBlobFromMarkdown(
      filename,
      `Resume — ${company}`,
      opts.resumeMarkdown,
      "resume",
    );
    out.resumePdf = {
      filename,
      base64: await blobToBase64(blob),
      mimeType: "application/pdf",
    };
  }

  if (opts.coverMarkdown?.trim()) {
    const filename = `cover-letter-${slug}.pdf`;
    const blob = await fetchPdfBlobFromMarkdown(
      filename,
      `Cover letter — ${company}`,
      opts.coverMarkdown,
      "cover",
    );
    out.coverPdf = {
      filename,
      base64: await blobToBase64(blob),
      mimeType: "application/pdf",
    };
  }

  return out;
}

export function resumeSlug(markdown: string): string {
  const first = markdown.split("\n").find((l) => l.trim()) ?? "resume";
  return (
    first
      .replace(/^#+\s*/, "")
      .replace(/\*\*/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "resume"
  );
}
