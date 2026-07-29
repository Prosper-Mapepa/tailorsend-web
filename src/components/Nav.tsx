"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui";
import { SiteLogo } from "@/components/SiteLogo";
import { UsageNavMenu, UsageNavMenuMobile } from "@/components/UsageNavMenu";

const MAIN_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/tailor", label: "Tailor" },
  { href: "/applications", label: "Applications" },
] as const;

const ACCOUNT_LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/billing", label: "Billing" },
] as const;

const ADMIN_LINK = { href: "/admin", label: "Admin" } as const;

const AUTH_PATHS = [
  "/sign-in",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function navItemClass(active: boolean) {
  return `flex items-center border-b-2 px-3 py-3.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 ${
    active
      ? "border-emerald-600 font-semibold text-emerald-800"
      : "border-transparent font-medium text-slate-600 hover:border-slate-200 hover:text-slate-900"
  }`;
}

function UserAvatar({ name, email }: { name: string; email: string }) {
  const initial = (name || email || "?").charAt(0).toUpperCase();
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-xs font-bold text-white shadow-sm">
      {initial}
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className={navItemClass(active)}>
      {label}
    </Link>
  );
}

function UserMenu({
  name,
  email,
  isAdmin,
  onSignOut,
}: {
  name: string;
  email: string;
  isAdmin?: boolean;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const accountLinks = isAdmin
    ? [...ACCOUNT_LINKS, ADMIN_LINK]
    : ACCOUNT_LINKS;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-xl border border-transparent py-1 pl-1 pr-2 transition outline-none hover:border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        <UserAvatar name={name} email={email} />
        <span className="hidden max-w-[120px] truncate text-sm text-slate-700 sm:inline">
          {name || email.split("@")[0]}
        </span>
        <svg
          className={`hidden h-4 w-4 text-slate-400 transition sm:block ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-slate-200/80 bg-white py-1.5 shadow-lg shadow-slate-200/50"
        >
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="truncate text-sm font-medium text-slate-900">
              {name || "Account"}
            </p>
            <p className="truncate text-xs text-slate-500">{email}</p>
          </div>
          {accountLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm transition hover:bg-slate-50 ${
                isActive(pathname, l.href)
                  ? "font-medium text-emerald-700"
                  : "text-slate-700"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="block w-full px-4 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      )}
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

  const accountLinks = user?.isAdmin
    ? [...ACCOUNT_LINKS, ADMIN_LINK]
    : ACCOUNT_LINKS;

  if (isAuthPage || isPublicLanding || isLegalPage) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 w-full max-w-6xl items-stretch px-4 sm:px-6">
        <div className="relative z-10 flex shrink-0 items-center">
          <SiteLogo size="sm" variant="light" hideNameBelow="md" />
        </div>

        <nav
          className="pointer-events-none absolute inset-x-4 top-0 hidden h-14 items-stretch justify-center md:flex sm:inset-x-6"
          aria-label="Main"
        >
          <div className="pointer-events-auto flex items-stretch">
            {MAIN_LINKS.map((l) => (
              <NavLink
                key={l.href}
                href={l.href}
                label={l.label}
                active={isActive(pathname, l.href)}
              />
            ))}
          </div>
        </nav>

        <div className="relative z-10 ml-auto flex items-center gap-1 sm:gap-2">
          {!loading && user && (
            <>
              <UsageNavMenu />
              <span
                className="hidden h-5 w-px bg-slate-200 md:block"
                aria-hidden
              />
              <div className="hidden md:block">
                <UserMenu
                  name={user.name}
                  email={user.email}
                  isAdmin={user.isAdmin}
                  onSignOut={signOut}
                />
              </div>
            </>
          )}
          {!loading && !user && (
            <Link href="/sign-in" className="hidden md:block">
              <Button size="sm">Sign in</Button>
            </Link>
          )}

          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-200/80 bg-white px-4 py-4 md:hidden">
          <nav className="space-y-1" aria-label="Main">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workflow
            </p>
            {MAIN_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive(pathname, l.href)
                    ? "bg-emerald-50 font-semibold text-emerald-800"
                    : "font-medium text-slate-700 hover:bg-slate-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <nav className="mt-4 space-y-1 border-t border-slate-100 pt-4" aria-label="Account">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Account
            </p>
            {accountLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive(pathname, l.href)
                    ? "bg-emerald-50 font-semibold text-emerald-800"
                    : "font-medium text-slate-700 hover:bg-slate-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {!loading && user && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <UsageNavMenuMobile onNavigate={() => setMobileOpen(false)} />
            </div>
          )}

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
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-800"
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
