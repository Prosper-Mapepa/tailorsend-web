"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui";
import { SiteLogo } from "@/components/SiteLogo";
import { UsageWidget } from "@/components/UsageWidget";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/jobs", label: "Jobs", icon: "◇" },
  { href: "/tailor", label: "Tailor", icon: "✦" },
  { href: "/applications", label: "Applications", icon: "▣" },
  { href: "/profile", label: "Profile", icon: "○" },
  { href: "/billing", label: "Billing", icon: "◎" },
];

const ADMIN_LINK = { href: "/admin", label: "Admin", icon: "⚙" };

const AUTH_PATHS = [
  "/sign-in",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function UserAvatar({ name, email }: { name: string; email: string }) {
  const initial = (name || email || "?").charAt(0).toUpperCase();
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-xs font-bold text-white shadow-sm">
      {initial}
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isPublicLanding = pathname === "/" && !loading && !user;
  const isLegalPage = pathname === "/terms" || pathname === "/privacy";

  const navLinks = user?.isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;

  if (isAuthPage || isPublicLanding || isLegalPage) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <SiteLogo size="sm" variant="light" />

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          <nav className="flex items-center gap-0.5 rounded-xl bg-slate-100/80 p-1">
            {navLinks.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {!loading && (
            <div className="ml-3 flex items-center gap-2 border-l border-slate-200 pl-3">
              {user && <UsageWidget compact />}
              {user ? (
                <>
                  <UserAvatar name={user.name} email={user.email} />
                  <span className="hidden max-w-[140px] truncate text-sm text-slate-500 lg:inline">
                    {user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/sign-in">
                  <Button size="sm">Sign in</Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-200/80 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-medium ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          {!loading && user && (
            <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
              <UserAvatar name={user.name} email={user.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user.name || "Account"}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
