import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { getAdminUser } from "@/lib/admin";
import { fetchAdminStats } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  const stats = await fetchAdminStats();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Admin
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {admin.email}
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Back to app
        </Link>
      </div>

      <AdminDashboard stats={stats} />
    </div>
  );
}
