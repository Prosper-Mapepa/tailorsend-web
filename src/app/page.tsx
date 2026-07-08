import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import {
  Alert,
  Button,
  Card,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { PublicLanding } from "@/components/PublicLanding";
import { UsageWidget } from "@/components/UsageWidget";

export const dynamic = "force-dynamic";

async function getStats(userId: string) {
  const [jobCount, topMatches, appCount, submitted, profile] =
    await Promise.all([
      prisma.job.count({ where: { status: { not: "hidden" } } }),
      prisma.job.count({ where: { matchScore: { gte: 60 } } }),
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: "submitted" } }),
      getProfile(userId),
    ]);
  return { jobCount, topMatches, appCount, submitted, profile };
}

export default async function HomePage() {
  const user = await getAuthUser();
  if (!user) return <PublicLanding />;

  const { jobCount, topMatches, appCount, submitted, profile } =
    await getStats(user.id);

  const profileReady =
    profile.baseResume.trim().length > 0 && profile.targetRoles.length > 0;

  const firstName = profile.fullName.split(" ")[0] || user.name || "there";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Find roles, tailor your resume with AI, and auto-fill applications — you review and submit."
        actions={
          <Link href="/jobs">
            <Button size="lg">Search jobs</Button>
          </Link>
        }
      />

      {!profileReady && (
        <Alert variant="warning">
          <p className="font-medium">Complete your profile to get started</p>
          <p className="mt-1 opacity-90">
            Upload your base resume and set target roles so we can score jobs and
            tailor applications for you.
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-flex text-sm font-semibold underline underline-offset-2"
          >
            Set up profile →
          </Link>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jobs found" value={jobCount} href="/jobs" accent="emerald" />
        <StatCard
          label="Strong matches"
          value={topMatches}
          href="/jobs"
          accent="teal"
        />
        <StatCard
          label="Applications"
          value={appCount}
          href="/applications"
          accent="green"
        />
        <StatCard
          label="Submitted"
          value={submitted}
          href="/applications"
          accent="amber"
        />
      </div>

      <UsageWidget />

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-4 grid gap-2">
            {[
              { href: "/jobs", label: "Search for jobs", desc: "Scan boards & score matches" },
              { href: "/tailor", label: "Tailor for a posting", desc: "Resume + cover letter in minutes" },
              { href: "/applications", label: "Review applications", desc: "Track drafts to submitted" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50/50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 group-hover:text-emerald-700">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <span className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-500">
                  →
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">Profile snapshot</h2>
          <dl className="mt-4 divide-y divide-slate-100">
            {[
              { label: "Name", value: profile.fullName || "—" },
              { label: "Target roles", value: profile.targetRoles.length },
              { label: "Skills", value: profile.skills.length },
              { label: "Visa status", value: profile.visaStatus || "—" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-4 py-2.5 text-sm first:pt-0"
              >
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="font-medium text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/profile"
            className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Edit profile →
          </Link>
        </Card>
      </div>
    </div>
  );
}
