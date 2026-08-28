"use client";

import { useEffect, useRef, useState } from "react";
import { Button, UploadZone } from "@/components/ui";
import { FormattedDocEditor } from "@/components/FormattedDocEditor";
import { apiFetch } from "@/lib/auth-client";
import { resumeSlug } from "@/lib/download";
import type { ResumeContact } from "@/lib/markdown";
import type { Project } from "@/lib/types";

type ResumeContext = {
  projects: Project[];
  contact: ResumeContact;
};

export function FormatResumePanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [persisted, setPersisted] = useState("");
  const [saving, setSaving] = useState(false);
  const [resumeContext, setResumeContext] = useState<ResumeContext | null>(
    null,
  );

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
        const existing = typeof data.baseResume === "string" ? data.baseResume : "";
        if (existing.trim()) {
          setMarkdown(existing);
          setPersisted(existing);
        }
      })
      .catch(() => {});
  }, []);

  const dirty = markdown !== persisted;
  const slug = resumeSlug(markdown || "resume");

  async function formatFile(file: File) {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/resume/format", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Formatting failed.");
      const next = data.markdown ?? "";
      setMarkdown(next);
      setPersisted("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveEdits() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseResume: markdown }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't save resume.");
      }
      setPersisted(markdown);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const replaceControl = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        disabled={loading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void formatFile(file);
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={loading}
        onClick={() => fileRef.current?.click()}
      >
        {loading ? "Formatting…" : "Replace resume"}
      </Button>
    </>
  );

  return (
    <div className="min-w-0 space-y-5">
      {markdown ? (
        <div className="min-w-0 space-y-4">
          <FormattedDocEditor
            label="Formatted resume"
            showLabel={false}
            hideTextDownloads
            value={markdown}
            onChange={setMarkdown}
            kind="resume"
            downloadSlug={slug}
            pdfTitle="Formatted resume"
            minHeight={480}
            resumeContext={resumeContext ?? undefined}
            toolbarExtra={replaceControl}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <Button
              onClick={() => void saveEdits()}
              disabled={saving || !dirty}
              size="sm"
            >
              {saving ? "Saving…" : dirty ? "Save edits" : "Saved"}
            </Button>
            <p className="text-xs text-slate-500">
              {dirty
                ? "Save to update your profile resume used when tailoring a job."
                : "Preview, Copy, and Download PDF match this layout."}
            </p>
            {fileName && !loading && (
              <p className="text-xs text-slate-500">
                Last file:{" "}
                <span className="font-medium text-slate-700">{fileName}</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
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
              Last file:{" "}
              <span className="font-medium text-slate-700">{fileName}</span>
            </p>
          )}
        </>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
