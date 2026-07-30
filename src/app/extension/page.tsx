import Link from "next/link";
import { SiteLogo } from "@/components/SiteLogo";

export const metadata = {
  title: "Install TailorSend Fill — Chrome extension",
  description:
    "Download and install the TailorSend Fill Chrome extension to autofill company apply forms in production.",
};

export default function ExtensionInstallPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <div className="flex items-center gap-3">
        <SiteLogo size="md" variant="brand" href="/" />
      </div>

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Chrome extension
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          TailorSend Fill
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          Appears automatically on company apply pages (like FrogHire). Fills
          your TailorSend answers, attaches resume/cover PDFs, and leaves submit
          to you.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          1. Download for production
        </h2>
        <a
          href="/api/extension/download"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
        >
          Download TailorSend Fill (.zip)
        </a>
        <p className="text-sm text-slate-600">
          Unzip the file. You&apos;ll load the{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            tailorsend-fill
          </code>{" "}
          folder in Chrome (next step).
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">2. Install</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>
            Open{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              chrome://extensions
            </code>
          </li>
          <li>
            Turn on <strong>Developer mode</strong> (top right)
          </li>
          <li>
            Click <strong>Load unpacked</strong>
          </li>
          <li>
            Select the unzipped{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              tailorsend-fill
            </code>{" "}
            folder (the one that contains{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              manifest.json
            </code>
            )
          </li>
          <li>
            Sign in at{" "}
            <Link href="/" className="font-medium text-emerald-700 hover:underline">
              tailorsend.cc
            </Link>{" "}
            so the extension can sync your account
          </li>
        </ol>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">3. Use</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>Tailor a job in TailorSend (resume + answers)</li>
          <li>Open the company apply page</li>
          <li>
            The green <strong>TailorSend</strong> panel appears bottom-right
          </li>
          <li>
            Click <strong>Fill this form</strong>, review fields and file
            uploads, then submit on the employer site
          </li>
        </ol>
        <p className="text-sm text-slate-500">
          You can also click <strong>Fill with extension</strong> from the Apply
          step in TailorSend. Server “preview fill” often fails on production
          ATS sites — the extension is the real path.
        </p>
      </section>

      <p className="text-sm text-slate-500">
        <Link href="/" className="font-medium text-emerald-700 hover:underline">
          ← Back to TailorSend
        </Link>
      </p>
    </div>
  );
}
