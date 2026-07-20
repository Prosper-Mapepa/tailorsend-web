import Link from "next/link";
import { DOC_LINKS } from "@/lib/docs-links";

export const metadata = {
  title: "Docs — TailorSend",
  description: "Business plan, financials, and SBDC application materials.",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          TailorSend
        </p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Docs
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
          Michigan SBDC application materials, financial projections, and setup
          notes.
        </p>
      </header>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {DOC_LINKS.filter((d) => !("internal" in d && d.internal)).map(
          (doc) => (
            <li key={doc.href}>
              <a
                href={doc.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-emerald-50/50"
              >
                <div>
                  <p className="font-semibold text-slate-900">{doc.label}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {doc.description}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-emerald-700">
                  Open →
                </span>
              </a>
            </li>
          ),
        )}
      </ul>

      <p className="text-sm text-slate-500">
        Source files also live in{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
          docs/investor/
        </code>
        .{" "}
        <Link href="/" className="font-medium text-emerald-700 hover:underline">
          Back to app
        </Link>
      </p>
    </div>
  );
}
