"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, PageHeader, SectionTitle, inputClass, labelClass } from "@/components/ui";
import { FormattedDocEditor } from "@/components/FormattedDocEditor";
import { FormResponsesPanel } from "@/components/FormResponsesPanel";
import { CompanyEdgePanel } from "@/components/CompanyEdgePanel";
import { MatchComparison } from "@/components/MatchComparison";
import { apiFetch } from "@/lib/auth-client";
import type { BuildIdea, CompanyEdge } from "@/lib/ai";
import type { MatchScore } from "@/lib/match-score";
import { mdToHtml, normalizeResumeMarkdown } from "@/lib/markdown";
import type { FormFieldResponse } from "@/lib/types";

type Mode = "url" | "screenshots" | "text";
type DocTab = "resume" | "cover" | "edge" | "form" | "notes";

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

const MODE_LABELS: Record<Mode, string> = {
  url: "Job link",
  screenshots: "Upload screenshots",
  text: "Paste description",
};

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

function FormatResumeSection() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [editing, setEditing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

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
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const slug = resumeSlug(markdown);
  const displayMd = markdown ? normalizeResumeMarkdown(markdown) : "";

  return (
    <Card className="border-emerald-200 bg-emerald-50/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-lg font-semibold">Format my resume</h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload a PDF, DOCX, or TXT resume and get a clean, formatted PDF —
            no job description required.
          </p>
        </div>
        <span className="ml-4 text-sm text-slate-500">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-emerald-100 pt-4">
          <div
            onClick={() => uploadRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) formatFile(f);
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-emerald-300 bg-white px-4 py-8 text-center hover:border-emerald-500"
          >
            <p className="text-sm font-medium text-slate-700">
              Click to upload or drag &amp; drop your resume
            </p>
            <p className="mt-1 text-xs text-slate-500">PDF, DOCX, TXT, or Markdown</p>
            {fileName && (
              <p className="mt-2 text-xs text-emerald-700">Last file: {fileName}</p>
            )}
          </div>
          <input
            ref={uploadRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) formatFile(f);
            }}
          />

          {loading && (
            <p className="text-sm text-slate-500">
              Reading your resume and applying professional formatting…
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {markdown && (
            <div className="space-y-3">
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
                <Button variant="secondary" onClick={copyMarkdown}>
                  {copied ? "Copied ✓" : "Copy"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => download(`${slug}.md`, displayMd)}
                >
                  Download .md
                </Button>
                <Button
                  disabled={pdfBusy}
                  onClick={async () => {
                    setPdfBusy(true);
                    try {
                      await downloadPdf(
                        `${slug}.pdf`,
                        "Formatted resume",
                        displayMd,
                      );
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
                    className="h-[420px] w-full resize-y rounded-md border border-slate-300 bg-white p-4 font-mono text-sm leading-relaxed text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Markdown supported. Edits apply to Copy, PDF, and .md downloads.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-6">
                  <div
                    className="doc-preview"
                    dangerouslySetInnerHTML={{ __html: mdToHtml(displayMd, { kind: "resume" }) }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function TailorPage() {
  const [mode, setMode] = useState<Mode>("url");
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tailor for a specific role"
        description={
          <>
            Paste a job link, upload screenshots, or paste the description. AI
            tailors your resume & cover letter from your{" "}
            <a href="/profile" className="font-medium text-emerald-600 hover:underline">
              profile
            </a>{" "}
            using only experience you listed.
          </>
        }
      />

      <FormatResumeSection />

      <Card>
        <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-slate-100/80 p-1">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                mode === m
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {mode === "url" && (
          <div>
            <label className={labelCls}>Job posting URL</label>
            <input
              className={field}
              placeholder="https://company.com/careers/senior-security-engineer"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Tip: some sites (LinkedIn, Workday) block bots. If a link fails,
              use screenshots or paste the text.
            </p>
          </div>
        )}

        {mode === "text" && (
          <div>
            <label className={labelCls}>Job description</label>
            <textarea
              className={`${field} min-h-[180px] font-mono`}
              placeholder="Paste the full job description here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        )}

        {mode === "screenshots" && (
          <div>
            <label className={labelCls}>Job screenshots</label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-emerald-400"
            >
              <p className="text-sm text-slate-600">
                Click to upload or drag &amp; drop screenshots
              </p>
              <p className="mt-1 text-xs text-slate-400">
                PNG/JPG, up to 6 images
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <ul className="mt-3 space-y-1">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-sm"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-slate-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => setShowOptional((s) => !s)}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            {showOptional ? "▾" : "▸"} Optional: set title / company / location
          </button>
          {showOptional && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={run} disabled={!canSubmit}>
            {loading ? "Tailoring…" : "Tailor resume & cover letter"}
          </Button>
          {loading && (
            <span className="text-sm text-slate-500">
              Reading the role and writing your documents…
            </span>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
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
