import type { AdminStats } from "@/lib/admin-stats";
import { Card, SectionTitle, StatCard } from "@/components/ui";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SignupChart({ data }: { data: AdminStats["signupsByDay"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d) => (
        <div
          key={d.date}
          className="group flex flex-1 flex-col items-center gap-1"
          title={`${d.date}: ${d.count}`}
        >
          <div
            className="w-full rounded-t bg-emerald-500/80 transition group-hover:bg-emerald-600"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row, i) => (
            <tr key={i} className="text-slate-700 hover:bg-slate-50/80">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDashboard({ stats }: { stats: AdminStats }) {
  const { overview } = stats;

  return (
    <div className="space-y-8">
      <p className="text-xs text-slate-400">
        Last updated {formatDateTime(stats.generatedAt)}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={overview.totalUsers} accent="emerald" />
        <StatCard
          label="New users (7d)"
          value={overview.usersLast7Days}
          accent="teal"
        />
        <StatCard
          label="New users (30d)"
          value={overview.usersLast30Days}
          accent="green"
        />
        <StatCard
          label="Student accounts"
          value={overview.studentAccounts}
          accent="amber"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Applications"
          value={overview.totalApplications}
          href="/applications"
          accent="emerald"
        />
        <StatCard
          label="Submitted"
          value={overview.submittedApplications}
          accent="teal"
        />
        <StatCard label="Drafts" value={overview.draftApplications} accent="green" />
        <StatCard label="Jobs indexed" value={overview.totalJobs} href="/jobs" accent="amber" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tailor kits (month)"
          value={overview.tailorKitsThisMonth}
          accent="emerald"
        />
        <StatCard
          label="Autofill kits (month)"
          value={overview.autofillKitsThisMonth}
          accent="teal"
        />
        <StatCard
          label="Credits in circulation"
          value={overview.totalCreditsBalance}
          accent="green"
        />
        <StatCard
          label="Plans tracked"
          value={stats.plansByType.reduce((n, p) => n + p.count, 0)}
          accent="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle
            title="Signups — last 30 days"
            description="Daily new registrations"
          />
          <SignupChart data={stats.signupsByDay} />
          <p className="mt-3 text-xs text-slate-400">
            {stats.signupsByDay.reduce((n, d) => n + d.count, 0)} total in period
          </p>
        </Card>

        <Card>
          <SectionTitle title="Applications by status" />
          <ul className="space-y-2">
            {stats.applicationsByStatus.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-medium capitalize text-slate-700">
                  {row.status}
                </span>
                <span className="font-semibold text-slate-900">{row.count}</span>
              </li>
            ))}
            {stats.applicationsByStatus.length === 0 && (
              <p className="text-sm text-slate-400">No applications yet.</p>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Plans" description="Usage accounts by plan type" />
          <ul className="space-y-2">
            {stats.plansByType.map((row) => (
              <li
                key={row.plan}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-medium capitalize text-slate-700">
                  {row.plan}
                </span>
                <span className="font-semibold text-slate-900">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle title="Usage events" description="All-time by kind" />
          <ul className="space-y-2">
            {stats.usageByKind.map((row) => (
              <li
                key={row.kind}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-medium capitalize text-slate-700">
                  {row.kind}
                </span>
                <span className="font-semibold text-slate-900">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card padding="none">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <SectionTitle
            title="Registered users"
            description={`${overview.totalUsers} total · showing latest 25`}
          />
        </div>
        <DataTable
          headers={[
            "Email",
            "Name",
            "Plan",
            "Apps",
            "Tailor",
            "Autofill",
            "Joined",
          ]}
          rows={stats.recentUsers.map((u) => [
            <span key="email" className="font-medium text-slate-900">
              {u.email}
              {u.role === "admin" && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                  admin
                </span>
              )}
              {u.isStudent && (
                <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                  .edu
                </span>
              )}
            </span>,
            u.name || "—",
            <span key="plan" className="capitalize">
              {u.plan}
              {u.creditBalance > 0 ? ` (+${u.creditBalance} cr)` : ""}
            </span>,
            u.applications,
            u.tailorKitsUsed,
            u.autofillKitsUsed,
            formatDate(u.createdAt),
          ])}
        />
      </Card>

      <Card padding="none">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <SectionTitle title="Recent usage events" description="Latest 20" />
        </div>
        <DataTable
          headers={["User", "Kind", "Credits", "When"]}
          rows={stats.recentUsageEvents.map((e) => [
            e.userEmail,
            <span key="kind" className="capitalize">
              {e.kind}
            </span>,
            e.creditsDelta === 0 ? "—" : e.creditsDelta,
            formatDateTime(e.createdAt),
          ])}
        />
      </Card>
    </div>
  );
}
