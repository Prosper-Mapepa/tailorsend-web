"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  PageLoader,
  Pagination,
  ScorePill,
  SectionTitle,
  inputClass,
} from "@/components/ui";
import { apiFetch } from "@/lib/auth-client";
import { parseUsageError } from "@/lib/billing/format";
import { supportsAutofill } from "@/lib/apply/detect";
import type { DatePosted, VisaRisk } from "@/lib/types";
import { visaRiskLabel } from "@/lib/visa";

interface JobRow {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  applyUrl: string;
  salary: string;
  matchScore: number;
  status: string;
  atsPlatform: string;
  visaRisk: VisaRisk;
  postedAt: string | null;
  applications: { id: string; status: string }[];
}

type JobGroup = "autofill" | "manual";

const PAGE_SIZE = 12;

const ALL_SOURCES = [
  { id: "greenhouse", label: "Greenhouse" },
  { id: "lever", label: "Lever" },
  { id: "remoteok", label: "RemoteOK" },
  { id: "weworkremotely", label: "WeWorkRemotely" },
  { id: "jsearch", label: "LinkedIn/Indeed (JSearch)" },
];

const DATE_OPTIONS: { id: DatePosted; label: string }[] = [
  { id: "today", label: "Past 24h" },
  { id: "3days", label: "Past 3 days" },
  { id: "week", label: "Past week" },
  { id: "month", label: "Past month" },
  { id: "all", label: "Any time" },
];

const field = inputClass;

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const days = Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function VisaTag({ risk }: { risk: VisaRisk }) {
  if (risk === "none") {
    return (
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
        {visaRiskLabel(risk)}
      </span>
    );
  }
  return (
    <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
      {visaRiskLabel(risk)}
    </span>
  );
}

function AutofillTag({ supported }: { supported: boolean }) {
  if (supported) {
    return (
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
        Auto-fill
      </span>
    );
  }
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
      Manual apply
    </span>
  );
}

function JobCard({
  job,
  tailoringId,
  onTailor,
  onSetStatus,
}: {
  job: JobRow;
  tailoringId: string | null;
  onTailor: (id: string) => void;
  onSetStatus: (id: string, status: string) => void;
}) {
  const app = job.applications[0];
  const applyUrl = job.applyUrl || job.url;
  const autofill = supportsAutofill(applyUrl, job.atsPlatform);

  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 font-semibold leading-snug text-slate-900 hover:text-emerald-600"
          >
            {job.title}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ScorePill score={job.matchScore} />
          <AutofillTag supported={autofill} />
        </div>
        <p className="line-clamp-2 text-sm text-slate-600">
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
          {job.remote ? " · Remote" : ""}
        </p>
        {job.salary && (
          <p className="text-xs text-slate-500">{job.salary}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          <span className="rounded bg-slate-100 px-1.5 py-0.5">{job.source}</span>
          {job.atsPlatform !== "unknown" && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5">
              {job.atsPlatform}
            </span>
          )}
          <VisaTag risk={job.visaRisk} />
          {job.postedAt && <span>{timeAgo(job.postedAt)}</span>}
        </div>
        {app && (
          <p className="text-xs text-slate-500">
            Application: <Badge status={app.status} />
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {app ? (
          <Link href={`/applications/${app.id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              Open application
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onTailor(job.id)}
            disabled={tailoringId === job.id}
          >
            {tailoringId === job.id ? "Tailoring…" : "Tailor & prep"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetStatus(job.id, "saved")}
        >
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSetStatus(job.id, "hidden")}
        >
          Hide
        </Button>
      </div>
    </Card>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [datePosted, setDatePosted] = useState<DatePosted>("week");
  const [fullTimeOnly, setFullTimeOnly] = useState(true);
  const [sponsorshipFriendly, setSponsorshipFriendly] = useState(true);
  const [sort, setSort] = useState<"recent" | "match">("recent");
  const [selectedSources, setSelectedSources] = useState<string[]>(
    ALL_SOURCES.map((s) => s.id),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [tailoringId, setTailoringId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const router = useRouter();
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    apiFetch("/api/profile")
      .then((r) => r.json())
      .then((p: { targetRoles?: { title: string }[] }) =>
        setTargetRoles(
          (p.targetRoles ?? []).map((r) => r.title).filter(Boolean),
        ),
      )
      .catch(() => {});
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      minScore: String(minScore),
      sort,
    });
    if (sponsorshipFriendly) params.set("sponsorshipFriendly", "1");
    const res = await apiFetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setLoading(false);
    setPage(1);
  }, [minScore, sort, sponsorshipFriendly]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function runSearch() {
    setSearching(true);
    setMessage(null);
    try {
      const res = await apiFetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query || undefined,
          location: location || undefined,
          remoteOnly,
          datePosted,
          fullTimeOnly,
          sponsorshipFriendlyOnly: sponsorshipFriendly,
          country: "us",
          sources: selectedSources,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      const errs = (data.perSource ?? []).filter(
        (s: { error?: string }) => s.error,
      );
      const parts = [`Found ${data.found} (${data.inserted} new).`];
      if (data.skippedStale) parts.push(`${data.skippedStale} too old.`);
      if (data.skippedClosed)
        parts.push(`${data.skippedClosed} closed/filled.`);
      if (data.skippedVisa)
        parts.push(`${data.skippedVisa} hidden (need sponsorship).`);
      if (errs.length)
        parts.push(
          `Issues: ${errs.map((e: { source: string }) => e.source).join(", ")}.`,
        );
      setMessage(parts.join(" "));
      await loadJobs();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function clearJobs() {
    setClearing(true);
    setMessage(null);
    try {
      const res = await apiFetch("/api/jobs", { method: "DELETE" });
      const data = await res.json();
      setMessage(`Cleared ${data.deleted ?? 0} jobs.`);
      await loadJobs();
    } finally {
      setClearing(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await apiFetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadJobs();
  }

  async function tailor(id: string) {
    setTailoringId(id);
    setMessage(null);
    const job = jobs.find((j) => j.id === id);
    try {
      const res = await apiFetch(`/api/jobs/${id}/tailor`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        const msg = parseUsageError(data);
        if (res.status === 402) {
          setMessage(`${msg} Go to Billing to add credits.`);
        } else {
          throw new Error(msg);
        }
        return;
      }
      const manual =
        job &&
        !supportsAutofill(job.applyUrl || job.url, job.atsPlatform);
      router.push(
        `/applications/${data.id}${manual ? "?tab=form" : ""}`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setTailoringId(null);
    }
  }

  function toggleSource(id: string) {
    setSelectedSources((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }

  const autofillJobs = jobs.filter((j) =>
    supportsAutofill(j.applyUrl || j.url, j.atsPlatform),
  );
  const manualJobs = jobs.filter(
    (j) => !supportsAutofill(j.applyUrl || j.url, j.atsPlatform),
  );

  const allJobs = useMemo(
    () => [
      ...autofillJobs.map((job) => ({ job, group: "autofill" as JobGroup })),
      ...manualJobs.map((job) => ({ job, group: "manual" as JobGroup })),
    ],
    [autofillJobs, manualJobs],
  );

  const totalPages = Math.max(1, Math.ceil(allJobs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageJobs = allJobs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Scan US job boards for recent roles, score matches against your profile, and tailor applications."
      />

      <Card className="space-y-4">
        {targetRoles.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Target roles
              </p>
              <Link
                href="/profile"
                className="text-xs font-medium text-emerald-600 hover:underline"
              >
                Edit →
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {targetRoles.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setQuery(t)}
                  title="Click to search this role"
                  className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  {t}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                All roles
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className={`${field} lg:col-span-2`}
            placeholder="Role keywords (blank = target roles)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input
            className={field}
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Button onClick={runSearch} disabled={searching} className="w-full">
            {searching ? "Scanning…" : "Scan for jobs"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            Remote only
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={fullTimeOnly}
              onChange={(e) => setFullTimeOnly(e.target.checked)}
            />
            Full-time only
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={sponsorshipFriendly}
              onChange={(e) => setSponsorshipFriendly(e.target.checked)}
            />
            Sponsorship-friendly
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            {filtersOpen ? "▾ Fewer options" : "▸ More options"}
          </button>
        </div>

        {filtersOpen && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Posted
                <select
                  className={field}
                  value={datePosted}
                  onChange={(e) =>
                    setDatePosted(e.target.value as DatePosted)
                  }
                >
                  {DATE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Min match
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                />
                <span className="w-8 font-medium">{minScore}%</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              {ALL_SOURCES.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(s.id)}
                    onChange={() => toggleSource(s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={clearJobs}
            disabled={clearing || searching}
          >
            {clearing ? "Clearing…" : "Clear results"}
          </Button>
          {message && (
            <p className="text-sm text-slate-500">{message}</p>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {jobs.length} job{jobs.length === 1 ? "" : "s"}
          {jobs.length > 0 && (
            <>
              {" "}
              ·{" "}
              <span className="text-emerald-700">
                {autofillJobs.length} auto-fill
              </span>
              {" · "}
              <span className="text-amber-800">
                {manualJobs.length} manual
              </span>
            </>
          )}
          {jobs.length > PAGE_SIZE && (
            <>
              {" "}
              · page {safePage} of {totalPages}
            </>
          )}
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Sort
          <select
            className={field}
            value={sort}
            onChange={(e) => setSort(e.target.value as "recent" | "match")}
          >
            <option value="recent">Most recent</option>
            <option value="match">Best match</option>
          </select>
        </label>
      </div>

      {loading ? (
        <PageLoader label="Loading jobs…" />
      ) : jobs.length === 0 ? (
        <Card>
          <p className="text-slate-500">
            No jobs yet. Configure your{" "}
            <Link href="/profile" className="text-emerald-600 underline">
              target roles
            </Link>{" "}
            and run a scan.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {pageJobs.map(({ job, group }, i) => {
              const prev = pageJobs[i - 1];
              const showAutofillHeader =
                group === "autofill" && prev?.group !== "autofill";
              const showManualHeader =
                group === "manual" && prev?.group !== "manual";

              return (
                <Fragment key={job.id}>
                  {showAutofillHeader && (
                    <div className="col-span-full">
                      <SectionTitle
                        title={`Auto-fill supported (${autofillJobs.length})`}
                        description="Greenhouse, Lever, Ashby — tailor and auto-fill in one click."
                      />
                    </div>
                  )}
                  {showManualHeader && (
                    <div className="col-span-full">
                      <SectionTitle
                        title={`Manual apply only (${manualJobs.length})`}
                        description="Workday, LinkedIn, and sign-in sites — tailor here, apply manually."
                      />
                    </div>
                  )}
                  <JobCard
                    job={job}
                    tailoringId={tailoringId}
                    onTailor={tailor}
                    onSetStatus={setStatus}
                  />
                </Fragment>
              );
            })}
          </div>

          <Pagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
