import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { Button, Card } from "@/components/ui";
import {
  DashboardWorkflow,
  getWorkflowState,
} from "@/components/DashboardWorkflow";
import { PublicLanding } from "@/components/PublicLanding";

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
  const hasResume = profile.baseResume.trim().length > 50;
  const roleCount = profile.targetRoles.length;

  const firstName = profile.fullName.split(" ")[0] || user.name || "there";
  const { activeIndex, allDone } = getWorkflowState(
    profileReady,
    jobCount,
    appCount,
    submitted,
  );

  const greetings = allDone
    ? `Nice work`
    : activeIndex === 0
      ? `Let's finish your profile`
      : activeIndex === 1
        ? `Find your next role`
        : activeIndex === 2
          ? `Ready to tailor?`
          : `Time to apply`;

  const stats = [
    { label: "Jobs saved", value: jobCount, href: "/jobs" },
    { label: "Strong matches", value: topMatches, href: "/jobs", accent: true },
    { label: "In progress", value: appCount, href: "/applications" },
    { label: "Submitted", value: submitted, href: "/applications" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {greetings}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Research companies, tailor honestly, autofill — you review and submit.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/jobs">
            <Button>Search jobs</Button>
          </Link>
          <Link href="/tailor">
            <Button variant="secondary">Tailor a role</Button>
          </Link>
        </div>
      </div>

      <DashboardWorkflow
        profileReady={profileReady}
        jobCount={jobCount}
        appCount={appCount}
        submitted={submitted}
        hasResume={hasResume}
        roleCount={roleCount}
      />

      <Card padding="none">
        <div className="grid divide-y divide-slate-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group px-5 py-4 transition hover:bg-slate-50/80"
            >
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p
                className={`mt-0.5 text-2xl font-bold tracking-tight ${
                  stat.accent && stat.value > 0
                    ? "text-emerald-700"
                    : "text-slate-900"
                }`}
              >
                {stat.value}
              </p>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-5 py-3 text-sm">
          <span className="text-slate-400">Profile</span>
          <span
            className={
              hasResume ? "font-medium text-emerald-700" : "text-amber-700"
            }
          >
            {hasResume ? "Resume on file" : "No resume"}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-medium text-slate-700">
            {roleCount} role{roleCount !== 1 ? "s" : ""}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-medium text-slate-700">
            {profile.skills.length} skills
          </span>
          <Link
            href="/profile"
            className="ml-auto text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Edit profile →
          </Link>
        </div>
      </Card>
    </div>
  );
}
