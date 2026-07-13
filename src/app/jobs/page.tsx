"use client";

import { useCallback, useEffect, useState } from "react";
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

type JobListTab = "autofill" | "manual";

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
  if (risk === "none") return null;
  return (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-100">
      {visaRiskLabel(risk)}
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
  const posted = job.postedAt ? timeAgo(job.postedAt) : null;
  const meta = [job.company, job.location, job.remote ? "Remote" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200/70 bg-white p-4 transition hover:border-slate-300/80 hover:shadow-sm">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 line-clamp-2 font-semibold leading-snug text-slate-900 hover:text-emerald-600"
          >
            {job.title}
          </a>
          <ScorePill score={job.matchScore} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {meta && <p className="text-sm text-slate-500">{meta}</p>}
          {posted && (
            <span className="shrink-0 rounded-md  px-2 py-0.5 text-xs font-bold text-[#009866] ">
              {posted}
            </span>
          )}
        </div>
        {job.salary && (
          <p className="text-xs text-slate-400">{job.salary}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <VisaTag risk={job.visaRisk} />
          {app && <Badge status={app.status} />}
        </div>
      </div>
      {/* <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSetStatus(job.id, "saved")}
          className="px-2 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => onSetStatus(job.id, "hidden")}
          className="px-2 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          Hide
        </button>
        </div> */}
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
        
        {app ? (
          <Link href={`/applications/${app.id}`}>
            <Button variant="outline" size="md" className="font-semibold border-green-500 text-green-500 hover:bg-green-500 hover:text-white">
              Open application
            </Button>
          </Link>
        ) : (
          <Button
            size="md"
            loading={tailoringId === job.id}
            onClick={() => onTailor(job.id)}
          >
            {tailoringId === job.id ? "Tailoring…" : "Tailor & prep"}
          </Button>
        )}
   
      </div>
    </div>
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
  const [jobTab, setJobTab] = useState<JobListTab>("autofill");
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

  const activeJobs = jobTab === "autofill" ? autofillJobs : manualJobs;

  const totalPages = Math.max(1, Math.ceil(activeJobs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageJobs = activeJobs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (
      jobTab === "autofill" &&
      autofillJobs.length === 0 &&
      manualJobs.length > 0
    ) {
      setJobTab("manual");
    }
  }, [autofillJobs.length, manualJobs.length, jobTab]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jobs"
        description="Scan boards, score matches, and tailor applications from your profile."
      />

      <Card>
        {targetRoles.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Roles:</span>
            {targetRoles.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQuery(t)}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                {t}
              </button>
            ))}
            <Link
              href="/profile"
              className="text-xs font-medium text-emerald-600 hover:underline"
            >
              Edit
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className={field}
              placeholder="Role keywords"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <input
              className={field}
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <Button
            onClick={runSearch}
            disabled={searching}
            size="lg"
            className="shrink-0 sm:mb-0.5"
          >
            {searching ? "Scanning…" : "Scan jobs"}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            Remote
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={fullTimeOnly}
              onChange={(e) => setFullTimeOnly(e.target.checked)}
            />
            Full-time
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={sponsorshipFriendly}
              onChange={(e) => setSponsorshipFriendly(e.target.checked)}
            />
            Sponsorship OK
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            {filtersOpen ? "Less" : "More filters"}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-3 space-y-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
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
                Min match {minScore}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-24"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              {ALL_SOURCES.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-1.5 text-xs text-slate-600"
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

        {message && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {message}
          </p>
        )}
      </Card>

      {!loading && jobs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => {
                setJobTab("autofill");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                jobTab === "autofill"
                  ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Auto-fill
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  jobTab === "autofill"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {autofillJobs.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setJobTab("manual");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                jobTab === "manual"
                  ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Manual
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  jobTab === "manual"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {manualJobs.length}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {totalPages > 1 && (
              <span className="text-xs text-slate-400">
                Page {safePage} of {totalPages}
              </span>
            )}
            <button
              type="button"
              onClick={clearJobs}
              disabled={clearing || searching}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
            >
              {clearing ? "Clearing…" : "Clear all"}
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Sort
              <select
                className={`${field} py-1.5`}
                value={sort}
                onChange={(e) => setSort(e.target.value as "recent" | "match")}
              >
                <option value="recent">Recent</option>
                <option value="match">Match</option>
              </select>
            </label>
          </div>
        </div>
      )}

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
          {pageJobs.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">
                No {jobTab === "autofill" ? "auto-fill" : "manual"} jobs in this
                list. Try the other tab or run a new scan.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {pageJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  tailoringId={tailoringId}
                  onTailor={tailor}
                  onSetStatus={setStatus}
                />
              ))}
            </div>
          )}

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
