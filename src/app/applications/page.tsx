"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
} from "@/components/ui";
import { apiFetch } from "@/lib/auth-client";

interface AppRow {
  id: string;
  status: string;
  updatedAt: string;
  submittedAt: string | null;
  job: {
    title: string;
    company: string;
    location: string;
    url: string;
  };
}

function formatUpdated(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function needsAttention(status: string) {
  return status === "needs_review" || status === "draft" || status === "autofilled";
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "action" | "ready">("all");

  useEffect(() => {
    apiFetch("/api/applications")
      .then((r) => r.json())
      .then((d) => setApps(d.applications ?? []))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(
    () => ({
      all: apps.length,
      action: apps.filter((a) => needsAttention(a.status)).length,
      ready: apps.filter((a) => a.status === "tailored" || a.status === "submitted").length,
    }),
    [apps],
  );

  const filtered = useMemo(() => {
    if (filter === "action") return apps.filter((a) => needsAttention(a.status));
    if (filter === "ready") {
      return apps.filter((a) => a.status === "tailored" || a.status === "submitted");
    }
    return apps;
  }, [apps, filter]);

  const filters = [
    { id: "all" as const, label: "All" },
    { id: "action" as const, label: "Needs attention" },
    { id: "ready" as const, label: "Ready" },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Track tailored applications from draft through submission."
        actions={
          !loading && apps.length > 0 ? (
            <Link href="/jobs">
              <Button variant="secondary" size="sm">
                Browse jobs
              </Button>
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <PageLoader label="Loading applications…" />
      ) : apps.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Tailor a job from the Jobs page to create your first application."
          action={
            <Link href="/jobs">
              <Button>Browse jobs</Button>
            </Link>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/60 px-3 py-2 sm:px-4">
            {filters.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                  filter === id
                    ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                }`}
              >
                {label}
                <span className="ml-1.5 text-slate-400">{counts[id]}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No applications in this view.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/applications/${a.id}`}
                    className="group flex items-center gap-3 px-3 py-3 transition hover:bg-slate-50/80 sm:gap-4 sm:px-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-emerald-800">
                        {a.job.title}
                      </p>
                      <p className="truncate text-xs text-slate-500 sm:text-sm">
                        {a.job.company}
                        {a.job.location ? ` · ${a.job.location}` : ""}
                      </p>
                    </div>
                    <Badge status={a.status} />
                    <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
                      {formatUpdated(a.updatedAt)}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-emerald-600 group-hover:text-emerald-700">
                      Review →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
