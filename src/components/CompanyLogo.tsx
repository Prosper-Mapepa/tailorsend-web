"use client";

import { useEffect, useState } from "react";
import {
  companyInitials,
  companyLogoCandidates,
  resolveCompanyDomain,
} from "@/lib/company-logo";

function InitialsMark({
  company,
  size,
  className,
}: {
  company: string;
  size: number;
  className: string;
}) {
  const initials = companyInitials(company || "Co");
  return (
    <span
      aria-hidden
      title={company}
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/80 font-bold tracking-tight text-slate-600 ring-1 ring-inset ring-slate-200/90 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(13, size * 0.3),
      }}
    >
      {initials}
    </span>
  );
}

export function CompanyLogo({
  company,
  url,
  applyUrl,
  size = 56,
  className = "",
}: {
  company: string;
  url?: string | null;
  applyUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const domain = resolveCompanyDomain(company, url, applyUrl);
  const candidates = domain ? companyLogoCandidates(domain) : [];
  const [srcIndex, setSrcIndex] = useState(0);

  useEffect(() => {
    setSrcIndex(0);
  }, [domain, company, url, applyUrl]);

  if (!domain || srcIndex >= candidates.length) {
    return (
      <InitialsMark company={company} size={size} className={className} />
    );
  }

  const src = candidates[srcIndex]!;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/90 ${className}`}
      style={{ width: size, height: size }}
      title={company}
    >
      <img
        key={src}
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setSrcIndex((i) => i + 1)}
        className="h-full w-full object-contain p-2"
      />
    </span>
  );
}
