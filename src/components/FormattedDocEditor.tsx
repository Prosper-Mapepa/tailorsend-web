"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/auth-client";
import {
  downloadPdfFromMarkdown,
  downloadText,
  resumeSlug,
} from "@/lib/download";
import {
  mdToHtml,
  prepareResumeMarkdown,
  type ResumeContact,
} from "@/lib/markdown";
import { ensureCoverLetterDate } from "@/lib/cover-letter";
import type { Project } from "@/lib/types";

function needsEducationReorder(md: string): boolean {
  const skills = md.search(/^##\s+(CORE SKILLS|SKILLS|TECHNICAL SKILLS|KEY SKILLS)\b/im);
  const education = md.search(/^##\s+EDUCATION\b/im);
  if (skills < 0 || education < 0) return false;
  return education < skills;
}

type ResumeContext = {
  projects: Project[];
  contact: ResumeContact;
};

export function FormattedDocEditor({
  label,
  value,
  onChange,
  kind,
  downloadSlug,
  pdfTitle,
  minHeight = 480,
  hideTextDownloads = false,
  showLabel = true,
  resumeContext,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: "resume" | "cover";
  downloadSlug: string;
  pdfTitle: string;
  minHeight?: number;
  hideTextDownloads?: boolean;
  showLabel?: boolean;
  /** When set, preview/PDF downloads use the same link injection as the server. */
  resumeContext?: ResumeContext;
}) {
  const [editing, setEditing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedContext, setFetchedContext] = useState<ResumeContext | null>(
    null,
  );

  useEffect(() => {
    if (kind !== "resume" || resumeContext) return;
    let cancelled = false;
    apiFetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.email) return;
        setFetchedContext({
          projects: data.projects ?? [],
          contact: {
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            location: data.location,
            linkedin: data.linkedin,
            github: data.github,
            website: data.website,
          },
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [kind, resumeContext]);

  const activeContext = resumeContext ?? fetchedContext;

  const displayMd = useMemo(() => {
    if (kind === "cover") return ensureCoverLetterDate(value);
    if (kind !== "resume") return value;
    return prepareResumeMarkdown(
      value,
      activeContext?.projects ?? [],
      activeContext?.contact,
    );
  }, [kind, value, activeContext]);

  // Persist fence cleanup + section reorder so the stored resume matches preview.
  useEffect(() => {
    if (kind !== "resume" || !activeContext) return;
    if (!/```/.test(value) && !needsEducationReorder(value)) return;
    if (displayMd && displayMd !== value) onChange(displayMd);
  }, [kind, value, displayMd, activeContext, onChange]);

  const slug = kind === "resume" ? resumeSlug(value) : downloadSlug;
  const baseName = kind === "resume" ? "resume" : "cover-letter";

  async function copyContent() {
    await navigator.clipboard.writeText(displayMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showLabel ? (
          <h2 className="text-lg font-semibold">{label}</h2>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                !editing
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                editing
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Edit
            </button>
          </div>
          <Button variant="secondary" onClick={copyContent}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
          <Button
            variant="secondary"
            disabled={pdfBusy}
            onClick={async () => {
              setPdfBusy(true);
              setError(null);
              try {
                await downloadPdfFromMarkdown(
                  `${baseName}-${slug}.pdf`,
                  pdfTitle,
                  displayMd,
                  kind,
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setPdfBusy(false);
              }
            }}
          >
            {pdfBusy ? "Building PDF…" : "Download PDF"}
          </Button>
          {!hideTextDownloads && (
            <>
              <Button
                variant="secondary"
                onClick={() => downloadText(`${baseName}-${slug}.md`, displayMd)}
              >
                Download .md
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadText(`${baseName}-${slug}.txt`, value, "text/plain")
                }
              >
                Download .txt
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {editing ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck
            style={{ minHeight }}
            className="w-full resize-y rounded-md border border-slate-300 bg-white p-4 font-mono text-sm leading-relaxed text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            Markdown supported. Edits apply to Copy, PDF, and downloads.
          </p>
        </div>
      ) : (
        <div
          className={`rounded-md border border-slate-200 bg-white p-6 ${
            kind === "cover" ? "cover-letter-preview" : "overflow-visible"
          }`}
        >
          <div
            className="doc-preview overflow-visible"
            dangerouslySetInnerHTML={{
              __html: mdToHtml(displayMd, { kind }),
            }}
          />
        </div>
      )}
    </div>
  );
}
