"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CompanyVisaProfile } from "@/components/CompanyVisaProfile";
import { CompanyLogo } from "@/components/CompanyLogo";
import { PageLoader, ScorePill } from "@/components/ui";
import {
  VisaBadges,
  VisaScoreChip,
} from "@/components/VisaBadges";
import { apiFetch } from "@/lib/auth-client";
import type { SponsorshipMeta } from "@/lib/sponsorship-meta";

type CompanyPayload = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  size: string;
  headquarters: string;
  website: string;
  optFriendly: string;
  stemOptFriendly: string;
  eVerify: string;
  h1bSponsor: string;
  greenCardSponsor: string;
  internationalHiring: string;
  citizenshipRequired: boolean;
  securityClearanceRequired: boolean;
  visaScore: number;
  sponsorshipMeta: SponsorshipMeta;
};

type JobRow = {
  id: string;
  title: string;
  location: string;
  remote: boolean;
  url: string;
  salary: string;
  matchScore: number;
  visaScore: number;
  visaRisk: string;
  visaAnalysis: Record<string, unknown>;
  postedAt: string | null;
};

export default function CompanyPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [company, setCompany] = useState<CompanyPayload | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await apiFetch(`/api/companies/${encodeURIComponent(slug)}`);
    if (res.status === 404) {
      setError("Company not found");
      setCompany(null);
      setJobs([]);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Could not load company");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCompany(data.company);
    setJobs(data.jobs ?? []);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader label="Loading company…" />;

  if (error || !company) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-600">{error || "Company not found"}</p>
        <Link
          href="/jobs"
          className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Back to jobs
        </Link>
      </div>
    );
  }

  const metaBits = [
    company.industry,
    company.size,
    company.headquarters,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href="/jobs"
        className="text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        ← Jobs
      </Link>

      <header className="flex flex-wrap items-start gap-4">
        <CompanyLogo company={company.name} url={company.website} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {company.name}
          </h1>
          {metaBits.length > 0 && (
            <p className="mt-1 text-sm text-slate-500">{metaBits.join(" · ")}</p>
          )}
          {company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline"
            >
              Website
            </a>
          ) : null}
        </div>
      </header>

      <CompanyVisaProfile
        visaScore={company.visaScore}
        optFriendly={company.optFriendly}
        stemOptFriendly={company.stemOptFriendly}
        h1bSponsor={company.h1bSponsor}
        greenCardSponsor={company.greenCardSponsor}
        eVerify={company.eVerify}
        citizenshipRequired={company.citizenshipRequired}
        securityClearanceRequired={company.securityClearanceRequired}
        internationalHiring={company.internationalHiring}
        sponsorshipMeta={company.sponsorshipMeta}
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Open roles
          <span className="ml-2 text-sm font-normal text-slate-400">
            {jobs.length}
          </span>
        </h2>
        {jobs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
            No indexed roles for this company yet. Run a job scan to discover
            postings.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {jobs.map((job) => {
              const reasons = Array.isArray(job.visaAnalysis?.reasons)
                ? (job.visaAnalysis.reasons as string[])
                : undefined;
              return (
                <li
                  key={job.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-emerald-700"
                    >
                      {job.title}
                    </a>
                    <ScorePill score={job.matchScore} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {[job.location, job.remote ? "Remote" : null]
                      .filter(Boolean)
                      .join(" · ") || "Location TBD"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <VisaScoreChip score={job.visaScore} reasons={reasons} />
                    <VisaBadges
                      analysis={job.visaAnalysis}
                      company={company}
                      visaRisk={job.visaRisk}
                    />
                  </div>
                  {job.salary ? (
                    <p className="mt-2 text-xs text-slate-500">{job.salary}</p>
                  ) : null}
                  <Link
                    href={`/jobs`}
                    className="mt-3 inline-block text-xs font-medium text-emerald-700 hover:underline"
                  >
                    View in jobs
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
