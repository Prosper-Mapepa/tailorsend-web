"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui";
import { SiteLogo } from "@/components/SiteLogo";
import { UsageWidget } from "@/components/UsageWidget";
import { DOC_LINKS } from "@/lib/docs-links";

const MAIN_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/tailor", label: "Tailor", highlight: true },
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
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function isDocsPath(pathname: string) {
  return pathname === "/docs" || pathname.startsWith("/docs/");
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
  highlight,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
        active
          ? "text-emerald-800"
          : highlight
            ? "text-slate-800 hover:text-emerald-700"
            : "text-slate-600 hover:text-slate-900"
      } ${active ? "bg-emerald-50" : "hover:bg-slate-50"}`}
    >
      {label}
      {active && (
        <span className="absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-emerald-600" />
      )}
    </Link>
  );
}

function DocsMenu({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = isDocsPath(pathname);

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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`relative inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
          active || open
            ? "bg-emerald-50 text-emerald-800"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        Docs
        <svg
          className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {active && (
          <span className="absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-emerald-600" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-50 mt-2 w-64 origin-top-left rounded-xl border border-slate-200/80 bg-white py-1.5 shadow-lg shadow-slate-200/50"
        >
          {DOC_LINKS.map((doc) =>
            "internal" in doc && doc.internal ? (
              <Link
                key={doc.href}
                href={doc.href}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="block px-4 py-2.5 transition hover:bg-slate-50"
              >
                <span className="block text-sm font-medium text-slate-900">
                  {doc.label}
                </span>
                <span className="block text-xs text-slate-500">
                  {doc.description}
                </span>
              </Link>
            ) : (
              <a
                key={doc.href}
                href={doc.href}
                role="menuitem"
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="block px-4 py-2.5 transition hover:bg-slate-50"
              >
                <span className="block text-sm font-medium text-slate-900">
                  {doc.label}
                </span>
                <span className="block text-xs text-slate-500">
                  {doc.description}
                </span>
              </a>
            ),
          )}
        </div>
      )}
    </div>
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-6">
        {/* Logo */}
        <div className="shrink-0">
          <SiteLogo size="sm" variant="light" />
        </div>

        {/* Desktop: centered workflow nav */}
        <nav
          className="hidden flex-1 items-center justify-center md:flex"
          aria-label="Main"
        >
          <div className="flex items-center gap-0.5 rounded-xl border border-slate-200/60 bg-slate-50/50 p-1">
            {MAIN_LINKS.map((l) => (
              <NavLink
                key={l.href}
                href={l.href}
                label={l.label}
                active={isActive(pathname, l.href)}
                highlight={"highlight" in l && l.highlight}
              />
            ))}
            <DocsMenu />
          </div>
        </nav>

        {/* Desktop: credits + account */}
        <div className="hidden items-center gap-1.5 md:flex">
          {!loading && user && (
            <Link
              href="/profile"
              className={`rounded-lg p-2 transition outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                isActive(pathname, "/profile")
                  ? "text-emerald-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Profile"
              aria-label="Profile"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>
          )}
          {!loading && user && <UsageWidget compact />}
          {!loading &&
            (user ? (
              <UserMenu
                name={user.name}
                email={user.email}
                isAdmin={user.isAdmin}
                onSignOut={signOut}
              />
            ) : (
              <Link href="/sign-in">
                <Button size="sm">Sign in</Button>
              </Link>
            ))}
        </div>

        {/* Mobile: credits + menu toggle */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          {!loading && user && <UsageWidget compact />}
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
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
              <NavLink
                key={l.href}
                href={l.href}
                label={l.label}
                active={isActive(pathname, l.href)}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>

          <nav className="mt-4 space-y-1 border-t border-slate-100 pt-4" aria-label="Docs">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Docs
            </p>
            {DOC_LINKS.map((doc) =>
              "internal" in doc && doc.internal ? (
                <NavLink
                  key={doc.href}
                  href={doc.href}
                  label={doc.label}
                  active={isActive(pathname, doc.href)}
                  onClick={() => setMobileOpen(false)}
                />
              ) : (
                <a
                  key={doc.href}
                  href={doc.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  {doc.label}
                </a>
              ),
            )}
          </nav>

          <nav className="mt-4 space-y-1 border-t border-slate-100 pt-4" aria-label="Account">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Account
            </p>
            {accountLinks.map((l) => (
              <NavLink
                key={l.href}
                href={l.href}
                label={l.label}
                active={isActive(pathname, l.href)}
                onClick={() => setMobileOpen(false)}
              />
            ))}
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
