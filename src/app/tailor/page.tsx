"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, PageHeader, UploadZone, inputClass, labelClass } from "@/components/ui";
import { FormattedDocEditor } from "@/components/FormattedDocEditor";
import { FormResponsesPanel } from "@/components/FormResponsesPanel";
import { CompanyEdgePanel } from "@/components/CompanyEdgePanel";
import { MatchComparison } from "@/components/MatchComparison";
import { apiFetch } from "@/lib/auth-client";
import type { BuildIdea, CompanyEdge } from "@/lib/ai";
import type { MatchScore } from "@/lib/match-score";
import { mdToHtml, prepareResumeMarkdown, type ResumeContact } from "@/lib/markdown";
import type { FormFieldResponse, Project } from "@/lib/types";

type InputMode = "url" | "screenshots" | "text" | "format";
type DocTab = "resume" | "cover" | "edge" | "form" | "notes";

const INPUT_TABS: { id: InputMode; label: string; hint: string }[] = [
  {
    id: "url",
    label: "Job link",
    hint: "Paste a posting URL — we fetch the description when the site allows it.",
  },
  {
    id: "screenshots",
    label: "Screenshots",
    hint: "Upload images of the job posting when a link won't load.",
  },
  {
    id: "text",
    label: "Paste text",
    hint: "Copy the full job description from any site.",
  },
  {
    id: "format",
    label: "Format resume",
    hint: "Upload any resume and get a clean, formatted PDF — no job needed.",
  },
];

const TAILOR_TABS = INPUT_TABS.filter((t) => t.id !== "format");
const FORMAT_TAB = INPUT_TABS.find((t) => t.id === "format")!;

const DOC_TABS: { id: DocTab; label: string }[] = [
  { id: "resume", label: "Tailored resume" },
  { id: "cover", label: "Cover letter" },
  { id: "edge", label: "Your edge" },
  { id: "form", label: "Form responses" },
  { id: "notes", label: "Match notes" },
];

interface TailorResult {
  job: { title: string; company: string; location: string; description: string };
  tailoredResume: string;
  coverLetter: string;
  matchNotes: string;
  beforeMatch: MatchScore;
  afterMatch: MatchScore;
  edge?: CompanyEdge | null;
}

const field = inputClass;
const labelCls = labelClass;

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
  const [result, setResult] = useState<TailorResult | null>(null);
  const [docTab, setDocTab] = useState<DocTab>("resume");
  const [edited, setEdited] = useState({
    resume: "",
    cover: "",
    notes: "",
  });
  const [incorporating, setIncorporating] = useState(false);
  const [edgeMsg, setEdgeMsg] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<FormFieldResponse[]>([]);
  const [formGenerating, setFormGenerating] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const formAutoGenerated = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const generateFormResponses = useCallback(
    async (file?: File) => {
      if (!result) throw new Error("Tailor a resume first.");
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        fd.append("title", result.job.title);
        fd.append("company", result.job.company);
        fd.append("location", result.job.location);
        fd.append("description", result.job.description);
        fd.append("tailoredResume", edited.resume);
        fd.append("coverLetter", edited.cover);
        const res = await apiFetch("/api/tailor/form-responses", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error ?? "Could not read form fields.");
        setFormFields(data.fields ?? []);
        return data.fields ?? [];
      }
      const res = await apiFetch("/api/tailor/form-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.job.title,
          company: result.job.company,
          location: result.job.location,
          description: result.job.description,
          tailoredResume: edited.resume,
          coverLetter: edited.cover,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? "Could not read form fields.");
      setFormFields(data.fields ?? []);
      return data.fields ?? [];
    },
    [result, edited.resume, edited.cover],
  );

  useEffect(() => {
    if (!result || docTab !== "form") return;
    if (formFields.length > 0 || formAutoGenerated.current) return;
    formAutoGenerated.current = true;
    setFormGenerating(true);
    void generateFormResponses()
      .catch(() => {
        formAutoGenerated.current = false;
      })
      .finally(() => {
        setFormGenerating(false);
      });
  }, [result, docTab, formFields.length, generateFormResponses]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs].slice(0, 6));
  }

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setFormFields([]);
    formAutoGenerated.current = false;
    setJobUrl("");
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
      if (!res.ok) throw new Error(data.error ?? "Tailoring failed.");
      setResult(data);
      setEdited({
        resume: data.tailoredResume ?? "",
        cover: data.coverLetter ?? "",
        notes: data.matchNotes ?? "",
      });
      setEdgeMsg(null);
      setJobUrl(mode === "url" ? url.trim() : "");
      setDocTab("resume");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function addIdeas(ideas: BuildIdea[]) {
    if (!result || ideas.length === 0) return;
    setIncorporating(true);
    setEdgeMsg(null);
    try {
      const res = await apiFetch("/api/tailor/incorporate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: edited.resume,
          coverLetter: edited.cover,
          job: { title: result.job.title, company: result.job.company },
          ideas,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't add suggestions.");
      setEdited((e) => ({
        ...e,
        resume: data.resume ?? e.resume,
        cover: data.coverLetter ?? e.cover,
      }));
      setEdgeMsg(
        `Added ${ideas.length} to your resume & cover letter ✓ (review in the Resume and Cover letter tabs)`,
      );
    } catch (e) {
      setEdgeMsg((e as Error).message);
    } finally {
      setIncorporating(false);
    }
  }

  const canSubmit =
    !loading &&
    ((mode === "url" && url.trim()) ||
      (mode === "text" && text.trim()) ||
      (mode === "screenshots" && files.length > 0));

  const slug = (result?.job.company || "role")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const visibleTabs = DOC_TABS.filter(
    (t) => t.id !== "edge" || result?.edge,
  );

  const isFormat = mode === "format";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tailor"
        description={
          <>
            Research the company, fix honest gaps, tailor documents, and autofill
            applications — all from your{" "}
            <a href="/profile" className="font-medium text-emerald-600 hover:underline">
              profile
            </a>
            .
          </>
        }
      />

      <Card>
        {!isFormat ? (
          <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3.5 sm:px-5">
            <p className="text-sm leading-relaxed text-slate-700">
              We research every company and suggest{" "}
              <span className="font-medium text-slate-900">honest gaps to fix</span>
              , then weave them into your resume and cover letter. Autofill
              applications on company career sites —{" "}
              <span className="font-medium text-slate-900">
                you review every field before you submit
              </span>
              .
            </p>
          </div>
        ) : (
          <p className="mb-4 text-sm text-slate-500">{FORMAT_TAB.hint}</p>
        )}

        <div className="mb-4 flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
          <div className="flex min-w-0 flex-1 gap-1">
            {TAILOR_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === tab.id
                    ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mx-0.5 hidden h-6 w-px shrink-0 bg-slate-200 sm:block" />
          <button
            type="button"
            onClick={() => setMode("format")}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isFormat
                ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {FORMAT_TAB.label}
          </button>
        </div>

        {isFormat ? (
            <FormatResumeTab />
          ) : (
            <div className="space-y-4">
              {mode === "url" && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label className={labelCls}>Job posting URL</label>
                      <input
                        className={field}
                        placeholder="https://company.com/careers/role"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && canSubmit) void run();
                        }}
                      />
                    </div>
                    <Button
                      onClick={run}
                      disabled={!canSubmit}
                      size="lg"
                      className="shrink-0 sm:mb-0.5"
                    >
                      {loading ? "Tailoring…" : "Tailor"}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">
                    LinkedIn and Workday often block bots — try Screenshots or
                    Paste text.
                  </p>
                </div>
              )}

              {mode === "text" && (
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Job description</label>
                    <textarea
                      className={`${field} min-h-[160px] text-sm leading-relaxed`}
                      placeholder="Paste the full job description…"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>
                  <Button onClick={run} disabled={!canSubmit} size="lg">
                    {loading ? "Tailoring…" : "Tailor resume & cover letter"}
                  </Button>
                </div>
              )}

              {mode === "screenshots" && (
                <div className="space-y-3">
                  <UploadZone
                    accept="image/*"
                    loading={false}
                    label="Drop screenshots here or click to browse"
                    hint="PNG or JPG · up to 6 images"
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
                    <ul className="space-y-1">
                      {files.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm"
                        >
                          <span className="truncate">{f.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setFiles((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                            className="text-slate-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button onClick={run} disabled={!canSubmit} size="lg">
                    {loading ? "Tailoring…" : "Tailor resume & cover letter"}
                  </Button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowOptional((s) => !s)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                {showOptional ? "▾" : "▸"} Optional: title, company, location
              </button>
              {showOptional && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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

              {loading && mode === "url" && (
                <p className="text-sm text-slate-500">
                  Reading the role and writing your documents…
                </p>
              )}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>
          )}
      </Card>

      {result && (
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {result.job.title || "Tailored documents"}
              </h2>
              <p className="text-sm text-slate-500">
                {[result.job.company, result.job.location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>

          {result.beforeMatch && result.afterMatch && (
            <div className="mb-6">
              <MatchComparison
                before={result.beforeMatch}
                after={result.afterMatch}
              />
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
            {visibleTabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDocTab(id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  docTab === id
                    ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                {label}
                {id === "edge" && result.edge?.build.length ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {result.edge.build.length}
                  </span>
                ) : null}
                {id === "form" && formFields.length > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {formFields.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {docTab === "form" ? (
            <FormResponsesPanel
              embedded
              applyPageUrl={jobUrl || null}
              initialFields={formFields}
              allowUpload
              allowGenerateWithoutScreenshot
              externalLoading={formGenerating}
              resumeMarkdown={edited.resume}
              coverMarkdown={edited.cover}
              downloadSlug={slug}
              companyName={result.job.company}
              onGenerate={generateFormResponses}
            />
          ) : docTab === "edge" ? (
            result.edge ? (
              <CompanyEdgePanel
                edge={result.edge}
                company={result.job.company}
                onAdd={addIdeas}
                adding={incorporating}
                addedMsg={edgeMsg}
              />
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                Company research isn&apos;t available for this role.
              </p>
            )
          ) : docTab === "notes" ? (
            <FormattedDocEditor
              label="Match notes"
              showLabel={false}
              hideTextDownloads
              value={edited.notes}
              onChange={(v) => setEdited((e) => ({ ...e, notes: v }))}
              kind="cover"
              downloadSlug={slug}
              pdfTitle={`Match notes — ${result.job.company}`}
              minHeight={420}
            />
          ) : (
            <FormattedDocEditor
              label={docTab === "resume" ? "Tailored resume" : "Cover letter"}
              showLabel={false}
              hideTextDownloads
              value={docTab === "resume" ? edited.resume : edited.cover}
              onChange={(v) =>
                setEdited((e) =>
                  docTab === "resume"
                    ? { ...e, resume: v }
                    : { ...e, cover: v },
                )
              }
              kind={docTab === "resume" ? "resume" : "cover"}
              downloadSlug={slug}
              pdfTitle={
                docTab === "resume"
                  ? `Resume — ${result.job.company}`
                  : `Cover letter — ${result.job.company}`
              }
              minHeight={docTab === "resume" ? 480 : 420}
            />
          )}
        </Card>
      )}
    </div>
  );
}
