"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, PageLoader, UploadZone } from "@/components/ui";
import { ProfileImportSummary } from "@/components/ProfileImportSummary";
import { useAuth } from "@/contexts/AuthProvider";
import { apiFetch } from "@/lib/auth-client";
import { readApiJson } from "@/lib/read-api-json";
import { markOnboardingComplete } from "@/lib/onboarding";

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [loading, user, router]);

  function finish() {
    if (user) markOnboardingComplete(user.id);
    router.push("/profile");
    router.refresh();
  }

  async function uploadResume(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/profile/import", {
        method: "POST",
        body: fd,
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      finish();
    } catch (e) {
      setError((e as Error).message);
      setUploading(false);
    }
  }

  if (loading || !user) return <PageLoader label="Loading…" />;

  const firstName = user.name?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-6 sm:py-10">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 text-3xl shadow-inner ring-1 ring-emerald-100">
          📄
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Welcome{firstName ? `, ${firstName}` : ""} — let&apos;s build your profile
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
          Upload your resume and we&apos;ll auto-fill your contact info,
          experience, education, projects, and skills. You can review and edit
          everything on the next step.
        </p>
      </div>

      <Card padding="default" className="mt-8 w-full border-slate-200/60">
        {error && (
          <div className="mb-4">
            <ProfileImportSummary error={error} />
          </div>
        )}
        <UploadZone
          accept=".pdf,.docx,.txt,.md"
          loading={uploading}
          label={
            uploading
              ? "Parsing your resume…"
              : "Drop your resume here or click to browse"
          }
          hint="PDF, DOCX, TXT, or Markdown · text-based PDFs work best"
          onFile={uploadResume}
        />
      </Card>

      <button
        type="button"
        onClick={finish}
        disabled={uploading}
        className="mt-6 text-sm font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-50"
      >
        Skip for now — I&apos;ll add my details manually
      </button>
    </div>
  );
}
