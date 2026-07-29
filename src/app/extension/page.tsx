import Link from "next/link";
import { SiteLogo } from "@/components/SiteLogo";

export const metadata = {
  title: "Install TailorSend Fill — Chrome extension",
  description:
    "Install the TailorSend Fill Chrome extension to fill real company apply forms from your answers.",
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
          Fills the real company apply page from your TailorSend answers. You
          review and submit on the employer&apos;s site.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Install</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>
            Open Chrome and go to{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              chrome://extensions
            </code>
          </li>
          <li>Turn on <strong>Developer mode</strong> (top right)</li>
          <li>
            Click <strong>Load unpacked</strong>
          </li>
          <li>
            Select the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">extension</code>{" "}
            folder from the TailorSend repo (the folder that contains{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">manifest.json</code>)
          </li>
          <li>Refresh TailorSend, open an application → Apply</li>
        </ol>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Use</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
          <li>Generate or edit form answers on the Apply step</li>
          <li>
            Click <strong>Fill with extension</strong>
          </li>
          <li>Chrome opens the company form and fills matching fields</li>
          <li>
            If you&apos;re still on a listing, click Apply there, then use{" "}
            <strong>Fill form</strong> on the banner or{" "}
            <strong>Re-fill active tab</strong> in the extension popup
          </li>
          <li>Review everything and submit on the company site</li>
        </ol>
        <p className="text-sm text-slate-500">
          Resume and cover letter PDFs are generated from your tailored docs and
          attached to matching file inputs when the form labels them (Resume/CV
          vs Cover letter). Always confirm the attachments before submitting.
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
