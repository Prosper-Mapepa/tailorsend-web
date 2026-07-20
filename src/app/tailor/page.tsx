"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, UploadZone, inputClass, labelClass } from "@/components/ui";
import {
  TailorResultWorkflow,
  type TailorWorkflowResult,
} from "@/components/TailorResultWorkflow";
import { jobLinkAutofillNotice } from "@/lib/apply/detect";
import { apiFetch } from "@/lib/auth-client";
import { parseUsageError } from "@/lib/billing/format";
import { mdToHtml, prepareResumeMarkdown, type ResumeContact } from "@/lib/markdown";
import type { Project } from "@/lib/types";

type InputMode = "url" | "screenshots" | "text" | "format";

const TAILOR_TABS: { id: Exclude<InputMode, "format">; label: string }[] = [
  { id: "url", label: "Job link" },
  { id: "screenshots", label: "Screenshots" },
  { id: "text", label: "Paste text" },
];

const field = inputClass;
const labelCls = labelClass;

function AutofillLinkStatus({ url }: { url: string }) {
  const notice = useMemo(() => jobLinkAutofillNotice(url), [url]);
  if (!notice) return null;

  const supported = notice.supported;
  return (
    <p
      role="status"
      className={`animate-[tailorFade_0.3s_ease-out] text-sm leading-snug ${
        supported ? "text-emerald-800" : "text-amber-800"
      }`}
    >
      <span className="font-semibold">{notice.title}.</span> {notice.detail}
    </p>
  );
}

function download(filename: string, text: string, type = "text/markdown") {
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

/** Render Markdown to a clean PDF server-side (no browser header/footer). */
async function downloadPdf(
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


function resumeSlug(markdown: string): string {
  const first = markdown.split("\n").find((l) => l.trim()) ?? "resume";
  return first
    .replace(/^#+\s*/, "")
    .replace(/\*\*/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "resume";
}

function FormatResumeTab() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [editing, setEditing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resumeContext, setResumeContext] = useState<{
    projects: Project[];
    contact: ResumeContact;
  } | null>(null);

  useEffect(() => {
    apiFetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.email) return;
        setResumeContext({
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
  }, []);

  async function formatFile(file: File) {
    setLoading(true);
    setError(null);
    setMarkdown("");
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/resume/format", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Formatting failed.");
      setMarkdown(data.markdown ?? "");
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const slug = resumeSlug(markdown);
  const displayMd = markdown
    ? prepareResumeMarkdown(
        markdown,
        resumeContext?.projects ?? [],
        resumeContext?.contact,
      )
    : "";

  return (
    <div className="space-y-5">
      <UploadZone
        accept=".pdf,.docx,.txt,.md"
        loading={loading}
        label={
          loading
            ? "Formatting your resume…"
            : "Drop your resume here or click to browse"
        }
        hint="PDF, DOCX, TXT, or Markdown"
        onFile={formatFile}
      />
      {fileName && !loading && (
        <p className="text-xs text-slate-500">
          Last file: <span className="font-medium text-slate-700">{fileName}</span>
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {markdown && (
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
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
            <Button variant="secondary" size="sm" onClick={copyMarkdown}>
              {copied ? "Copied ✓" : "Copy"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => download(`${slug}.md`, displayMd)}
            >
              Download .md
            </Button>
            <Button
              size="sm"
              disabled={pdfBusy}
              onClick={async () => {
                setPdfBusy(true);
                try {
                  await downloadPdf(`${slug}.pdf`, "Formatted resume", displayMd);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setPdfBusy(false);
                }
              }}
            >
              {pdfBusy ? "Generating PDF…" : "Download PDF"}
            </Button>
          </div>

          {editing ? (
            <div>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                spellCheck
                className="h-[420px] w-full resize-y rounded-lg border border-slate-200 bg-white p-4 font-mono text-sm leading-relaxed text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="mt-1 text-xs text-slate-400">
                Markdown supported. Edits apply to Copy, PDF, and .md downloads.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div
                className="doc-preview"
                dangerouslySetInnerHTML={{
                  __html: mdToHtml(displayMd, { kind: "resume" }),
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TailorPage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TailorWorkflowResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs].slice(0, 6));
  }

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res: Response;
      if (mode === "screenshots") {
        if (files.length === 0) throw new Error("Add at least one screenshot.");
        const fd = new FormData();
        files.forEach((f) => fd.append("images", f));
        if (title) fd.append("title", title);
        if (company) fd.append("company", company);
        if (location) fd.append("location", location);
        res = await apiFetch("/api/tailor", { method: "POST", body: fd });
      } else {
        const payload: Record<string, string> = { title, company, location };
        if (mode === "url") payload.url = url;
        if (mode === "text") payload.text = text;
        res = await apiFetch("/api/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(parseUsageError(data));
      if (!data.applicationId) {
        throw new Error("Tailoring succeeded but no application was saved.");
      }
      setResult(data as TailorWorkflowResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !loading &&
    ((mode === "url" && url.trim()) ||
      (mode === "text" && text.trim()) ||
      (mode === "screenshots" && files.length > 0));

  const isFormat = mode === "format";
  const urlNotice = mode === "url" ? jobLinkAutofillNotice(url) : null;

  return (
    <div className="space-y-10">
      <section className="w-full">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {/* <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              TailorSend
            </p> */}
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Tailor
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
              Tailor your applcation documents from a job link, job description or screenshots using your{" "}
              <a
                href="/profile"
                className="font-medium text-emerald-700 hover:underline"
              >
                profile
              </a>
              .
            </p>
          </div>
          <ul className="flex flex-wrap gap-2 sm:justify-end">
            {[
              "ATS-ready resume",
              "Cover letter",
              "Form answers",
              "Auto-fill",
            ].map((label) => (
              <li
                key={label}
                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200/70"
              >
                {label}
              </li>
            ))}
          </ul>
        </header>

        <div className="w-full min-w-0">
              {!isFormat ? (
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                      role="tablist"
                      aria-label="Input method"
                      className="inline-flex rounded-xl bg-emerald-50/90 p-1 ring-1 ring-emerald-100"
                    >
                      {TAILOR_TABS.map((tab) => {
                        const active = mode === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setMode(tab.id)}
                            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                              active
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-emerald-900/65 hover:text-emerald-950"
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMode("format")}
                      className="text-sm font-medium text-emerald-800/80 transition hover:text-emerald-950"
                    >
                      Format resume →
                    </button>
                  </div>

                  {mode === "url" ? (
                    <div
                      className={`flex flex-col gap-2 rounded-2xl border bg-white p-2 transition sm:flex-row sm:items-center ${
                        urlNotice && !urlNotice.supported
                          ? "border-amber-300"
                          : urlNotice?.supported
                            ? "border-emerald-400"
                            : "border-emerald-100"
                      }`}
                    >
                      <input
                        className="h-11 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:px-3.5"
                        placeholder="https://boards.greenhouse.io/…"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && canSubmit) void run();
                        }}
                        autoComplete="off"
                        spellCheck={false}
                        aria-label="Job posting URL"
                      />
                      <Button
                        onClick={run}
                        disabled={!canSubmit}
                        size="lg"
                        className="h-11 shrink-0 sm:min-w-[7.25rem]"
                      >
                        {loading ? "Working…" : "Tailor"}
                      </Button>
                    </div>
                  ) : mode === "text" ? (
                    <div className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-2">
                      <textarea
                        className="min-h-[9rem] w-full resize-y rounded-xl border-0 bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 sm:px-3.5"
                        placeholder="Paste the full job description"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        aria-label="Job description"
                      />
                      <div className="flex justify-end px-1 pb-1">
                        <Button onClick={run} disabled={!canSubmit} size="lg">
                          {loading ? "Working…" : "Tailor"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-3">
                      <UploadZone
                        accept="image/*"
                        loading={false}
                        label="Drop screenshots or click to browse"
                        hint="PNG or JPG · up to 6"
                        onFile={(file) =>
                          setFiles((prev) => [...prev, file].slice(0, 6))
                        }
                      />
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => addFiles(e.target.files)}
                      />
                      {files.length > 0 && (
                        <ul className="space-y-1 px-1">
                          {files.map((f, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between text-sm text-slate-600"
                            >
                              <span className="truncate">{f.name}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFiles((prev) =>
                                    prev.filter((_, idx) => idx !== i),
                                  )
                                }
                                className="ml-3 shrink-0 text-slate-400 hover:text-red-600"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex justify-end">
                        <Button onClick={run} disabled={!canSubmit} size="lg">
                          {loading ? "Working…" : "Tailor"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {/* {mode === "url" && urlNotice ? (
                      <AutofillLinkStatus url={url} />
                    ) : mode === "url" ? (
                      <p className="text-sm text-emerald-900/70">
                        Auto-fill on{" "}
                        <span className="font-semibold text-emerald-900">
                          Greenhouse, Lever, Ashby
                        </span>
                        . Other links still get tailored docs.
                      </p>
                    ) : (
                      <p className="text-sm text-emerald-900/70">
                        Auto-fill needs a job link. You still get tailored docs.
                      </p>
                    )} */}
{/* 
                    <button
                      type="button"
                      onClick={() => setShowOptional((s) => !s)}
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-800/55 transition hover:text-emerald-950"
                    >
                      <span
                        aria-hidden
                        className={`inline-block text-xs transition ${
                          showOptional ? "rotate-45" : ""
                        }`}
                      >
                        +
                      </span>
                      {showOptional
                        ? "Hide job details"
                        : "Add title, company, location"}
                    </button> */}

                    {showOptional && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className={labelCls}>Title</label>
                          <input
                            className={field}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Company</label>
                          <input
                            className={field}
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Location</label>
                          <input
                            className={field}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {loading && (
                    <p className="text-sm font-medium text-emerald-700">
                      Reading the role and writing your documents…
                    </p>
                  )}
                  {error && <p className="text-sm text-red-700">{error}</p>}
                </div>
              ) : (
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <button
                    type="button"
                    onClick={() => setMode("url")}
                    className="text-sm font-medium text-emerald-800 transition hover:text-emerald-950"
                  >
                    ← Back to tailor
                  </button>
                  <FormatResumeTab />
                  {error && <p className="text-sm text-red-700">{error}</p>}
                </div>
              )}
            </div>
      </section>

      {result && (
        <div className="animate-[tailorFade_0.45s_ease-out]">
          <TailorResultWorkflow result={result} />
        </div>
      )}
    </div>
  );
}
