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
  const res = await apiFetch("/api/tailor/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, title, filename, kind }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "PDF generation failed.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
