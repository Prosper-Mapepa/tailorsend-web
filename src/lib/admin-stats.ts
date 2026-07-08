import { prisma } from "@/lib/db";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(dateKey(d));
  }
  return keys;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  isStudent: boolean;
  creditBalance: number;
  applications: number;
  tailorKitsUsed: number;
  autofillKitsUsed: number;
  createdAt: string;
}

export interface AdminStats {
  generatedAt: string;
  overview: {
    totalUsers: number;
    usersLast7Days: number;
    usersLast30Days: number;
    totalApplications: number;
    submittedApplications: number;
    draftApplications: number;
    totalJobs: number;
    studentAccounts: number;
    totalCreditsBalance: number;
    tailorKitsThisMonth: number;
    autofillKitsThisMonth: number;
  };
  applicationsByStatus: { status: string; count: number }[];
  plansByType: { plan: string; count: number }[];
  usageByKind: { kind: string; count: number }[];
  signupsByDay: { date: string; count: number }[];
  recentUsers: AdminUserRow[];
  recentUsageEvents: {
    id: string;
    userEmail: string;
    kind: string;
    creditsDelta: number;
    createdAt: string;
  }[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const sevenDaysAgo = daysAgo(7);
  const thirtyDaysAgo = daysAgo(30);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [
    totalUsers,
    usersLast7Days,
    usersLast30Days,
    totalApplications,
    submittedApplications,
    draftApplications,
    totalJobs,
    studentAccounts,
    creditsAgg,
    tailorMonth,
    autofillMonth,
    appStatusGroups,
    planGroups,
    usageKindGroups,
    signupUsers,
    recentUsersRaw,
    recentEventsRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.application.count(),
    prisma.application.count({ where: { status: "submitted" } }),
    prisma.application.count({ where: { status: "draft" } }),
    prisma.job.count(),
    prisma.usageAccount.count({ where: { isStudent: true } }),
    prisma.usageAccount.aggregate({ _sum: { creditBalance: true } }),
    prisma.usageEvent.count({
      where: { kind: "tailor", createdAt: { gte: monthStart } },
    }),
    prisma.usageEvent.count({
      where: { kind: "autofill", createdAt: { gte: monthStart } },
    }),
    prisma.application.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.usageAccount.groupBy({
      by: ["plan"],
      _count: { _all: true },
    }),
    prisma.usageEvent.groupBy({
      by: ["kind"],
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        usageAccount: true,
        _count: { select: { applications: true } },
      },
    }),
    prisma.usageEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { email: true } } },
    }),
  ]);

  const signupMap = new Map<string, number>();
  for (const key of lastNDays(30)) signupMap.set(key, 0);
  for (const u of signupUsers) {
    const key = dateKey(u.createdAt);
    signupMap.set(key, (signupMap.get(key) ?? 0) + 1);
  }

  return {
    generatedAt: now.toISOString(),
    overview: {
      totalUsers,
      usersLast7Days,
      usersLast30Days,
      totalApplications,
      submittedApplications,
      draftApplications,
      totalJobs,
      studentAccounts,
      totalCreditsBalance: creditsAgg._sum.creditBalance ?? 0,
      tailorKitsThisMonth: tailorMonth,
      autofillKitsThisMonth: autofillMonth,
    },
    applicationsByStatus: appStatusGroups.map((g) => ({
      status: g.status,
      count: g._count._all,
    })),
    plansByType: planGroups.map((g) => ({
      plan: g.plan,
      count: g._count._all,
    })),
    usageByKind: usageKindGroups.map((g) => ({
      kind: g.kind,
      count: g._count._all,
    })),
    signupsByDay: lastNDays(30).map((date) => ({
      date,
      count: signupMap.get(date) ?? 0,
    })),
    recentUsers: recentUsersRaw.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      plan: u.usageAccount?.plan ?? "free",
      isStudent: u.usageAccount?.isStudent ?? false,
      creditBalance: u.usageAccount?.creditBalance ?? 0,
      applications: u._count.applications,
      tailorKitsUsed: u.usageAccount?.tailorKitsUsed ?? 0,
      autofillKitsUsed: u.usageAccount?.autofillKitsUsed ?? 0,
      createdAt: u.createdAt.toISOString(),
    })),
    recentUsageEvents: recentEventsRaw.map((e) => ({
      id: e.id,
      userEmail: e.user.email,
      kind: e.kind,
      creditsDelta: e.creditsDelta,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
