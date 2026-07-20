"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import {
  downloadPdfFromMarkdown,
  resumeSlug,
} from "@/lib/download";
import {
  fieldTypeLabel,
  fileFieldKind,
  isCopyableField,
} from "@/lib/form-field-utils";
import { normalizeResumeMarkdown } from "@/lib/markdown";
import { ensureCoverLetterDate } from "@/lib/cover-letter";
import type { FormFieldResponse } from "@/lib/types";

export function FormResponsesPanel({
  screenshotUrl,
  applyPageUrl,
  pageCaptureLoading = false,
  onGenerate,
  initialFields = [],
  allowUpload = true,
  allowGenerateWithoutScreenshot = true,
  externalLoading = false,
  embedded = false,
  resumeMarkdown = "",
  coverMarkdown = "",
  downloadSlug = "application",
  companyName = "",
}: {
  screenshotUrl?: string | null;
  applyPageUrl?: string | null;
  pageCaptureLoading?: boolean;
  onGenerate: (file?: File) => Promise<FormFieldResponse[]>;
  initialFields?: FormFieldResponse[];
  allowUpload?: boolean;
  allowGenerateWithoutScreenshot?: boolean;
  externalLoading?: boolean;
  embedded?: boolean;
  resumeMarkdown?: string;
  coverMarkdown?: string;
  downloadSlug?: string;
  companyName?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState<FormFieldResponse[]>(initialFields);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const displaySrc = preview ?? screenshotUrl ?? null;
  const busy = loading || externalLoading;

  useEffect(() => {
    if (initialFields.length > 0) setFields(initialFields);
  }, [initialFields]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function run(file?: File) {
    setLoading(true);
    setError(null);
    try {
      const result = await onGenerate(file);
      setFields(result);
      if (result.length === 0) {
        setError(
          "No application form fields detected. Upload a screenshot of the apply form (not just the job posting).",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function copyAnswer(idx: number, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  async function copyAll() {
    const text = fields
      .filter(isCopyableField)
      .map((f) => `${f.label}\n${f.answer}`)
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setCopiedIdx(-1);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  async function downloadFile(idx: number, kind: "resume" | "cover") {
    const markdown =
      kind === "resume" ? resumeMarkdown : coverMarkdown;
    if (!markdown.trim()) {
      setError(
        kind === "resume"
          ? "Tailored resume is empty — save or regenerate it first."
          : "Cover letter is empty — save or regenerate it first.",
      );
      return;
    }

    setDownloadingIdx(idx);
    setError(null);
    try {
      const displayMd =
        kind === "resume"
          ? normalizeResumeMarkdown(markdown)
          : ensureCoverLetterDate(markdown);
      const slug =
        kind === "resume" ? resumeSlug(markdown) : downloadSlug;
      const baseName = kind === "resume" ? "resume" : "cover-letter";
      const title =
        kind === "resume"
          ? `Resume — ${companyName || "Application"}`
          : `Cover letter — ${companyName || "Application"}`;

      await downloadPdfFromMarkdown(
        `${baseName}-${slug}.pdf`,
        title,
        displayMd,
        kind,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloadingIdx(null);
    }
  }

  const copyableCount = fields.filter(isCopyableField).length;
  const Wrapper = embedded ? "div" : Card;

  return (
    <Wrapper className={embedded ? "space-y-4" : undefined}>
      <div
        className={
          embedded
            ? "flex flex-wrap items-center justify-between gap-3"
            : "mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4"
        }
      >
        {!embedded && (
          <div>
            <h2 className="text-lg font-semibold">Application form responses</h2>
            <p className="mt-1 text-sm text-slate-500">
              Match fields from the form to your tailored materials.
            </p>
          </div>
        )}
        <div className={`flex flex-wrap gap-2 ${embedded ? "ml-auto" : ""}`}>
          {(screenshotUrl || allowGenerateWithoutScreenshot) && (
            <Button variant="secondary" disabled={busy} onClick={() => run()}>
              {busy
                ? "Generating…"
                : screenshotUrl
                  ? "Regenerate from screenshot"
                  : "Generate answers"}
            </Button>
          )}
          {allowUpload && (
            <>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Upload screenshot
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(URL.createObjectURL(f));
                  run(f);
                }}
              />
            </>
          )}
          {copyableCount > 0 && (
            <Button variant="ghost" onClick={copyAll}>
              {copiedIdx === -1 ? "Copied all ✓" : "Copy all text"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="flex max-h-[70vh] min-h-[20rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {displaySrc ? "Application form" : "Apply page"}
            </h3>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-slate-50">
            {displaySrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displaySrc}
                alt="Application form screenshot"
                className="block w-full"
              />
            ) : applyPageUrl ? (
              <div className="relative h-full min-h-[28rem]">
                {pageCaptureLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-slate-600">
                    Capturing apply page…
                  </div>
                )}
                <iframe
                  title="Job application page"
                  src={applyPageUrl}
                  className="h-full min-h-[28rem] w-full bg-white"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            ) : (
              <div className="flex h-full min-h-48 items-center justify-center px-6 text-center text-sm text-slate-400">
                Upload a form screenshot or generate answers from the job
                posting.
              </div>
            )}
          </div>
          {applyPageUrl && !displaySrc && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              <a
                href={applyPageUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-emerald-600 hover:underline"
              >
                Open apply page in new tab
              </a>
            </p>
          )}
        </section>

        <section className="flex max-h-[70vh] min-h-[20rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Your answers
            </h3>
            {fields.length > 0 && (
              <span className="text-xs text-slate-400">
                {fields.length} field{fields.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {fields.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              <div className="space-y-2">
              {fields.map((f, i) => {
                const fileKind = fileFieldKind(f);
                const isFile = fileKind !== null;

                return (
                  <div
                    key={`${f.label}-${i}`}
                    className={`rounded-lg border bg-white p-3 ${
                      isFile
                        ? "border-emerald-200/80"
                        : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {f.label}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                            {fieldTypeLabel(f.fieldType)}
                          </span>
                        </div>

                        {isFile ? (
                          <p className="mt-2 text-sm text-slate-600">
                            {fileKind === "cover"
                              ? "Download your tailored cover letter PDF and upload it to this field."
                              : "Download your tailored resume PDF and upload it to this field."}
                          </p>
                        ) : (
                          <div className="mt-2 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2">
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                              {f.answer}
                            </p>
                          </div>
                        )}
                      </div>

                      {isFile ? (
                        <Button
                          variant="secondary"
                          className="shrink-0"
                          disabled={downloadingIdx === i}
                          onClick={() =>
                            downloadFile(i, fileKind as "resume" | "cover")
                          }
                        >
                          {downloadingIdx === i ? "Preparing…" : "Download"}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          className="shrink-0"
                          onClick={() => copyAnswer(i, f.answer)}
                        >
                          {copiedIdx === i ? "Copied ✓" : "Copy"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              {busy ? (
                <p className="text-sm text-slate-500">Reading form fields…</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    Optional backup answers
                  </p>
                  <p className="max-w-xs text-sm leading-relaxed text-slate-500">
                    Prefer auto-fill above. Upload a screenshot of the{" "}
                    <span className="font-medium text-slate-700">
                      application form
                    </span>{" "}
                    (not the job posting) if you need copy-paste answers.
                  </p>
                  {allowUpload && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                    >
                      Upload form screenshot
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </Wrapper>
  );
}
