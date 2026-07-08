import type { ReactNode } from "react";
import Link from "next/link";
import { SiteLogo } from "@/components/SiteLogo";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
  LEGAL_SITE_NAME,
} from "@/lib/legal";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl pb-16">
      <div className="mb-10 border-b border-slate-200 pb-8">
        <SiteLogo size="sm" variant="brand" className="mb-6" />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: {LEGAL_LAST_UPDATED} · {LEGAL_SITE_NAME}
        </p>
      </div>

      <div className="legal-prose space-y-8 text-sm leading-relaxed text-slate-600">
        {children}
      </div>

      <footer className="mt-12 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500">
        <Link href="/terms" className="hover:text-emerald-600">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-emerald-600">
          Privacy
        </Link>
        <a
          href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          className="hover:text-emerald-600"
        >
          {LEGAL_CONTACT_EMAIL}
        </a>
        <Link href="/" className="ml-auto hover:text-emerald-600">
          ← Back to home
        </Link>
      </footer>
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
