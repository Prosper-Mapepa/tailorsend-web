"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProfileCountBadge } from "@/components/ProfileCountBadge";
import { PROFILE_NAV_ITEMS } from "@/lib/profile-nav";

export type ProfileNavCounts = Partial<Record<string, number>>;

const SCROLL_OFFSET = 120;
const CLICK_LOCK_MS = 1600;

function readHashId(): string | null {
  const id = window.location.hash.slice(1);
  return PROFILE_NAV_ITEMS.some((i) => i.id === id) ? id : null;
}

function resolveActiveSection(): string {
  let current = PROFILE_NAV_ITEMS[0]?.id ?? "";
  for (const { id } of PROFILE_NAV_ITEMS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.height < 4 && rect.width < 4) continue;
    if (rect.top <= SCROLL_OFFSET) current = id;
  }
  const activeEl = document.getElementById(current);
  if (
    activeEl &&
    activeEl.getBoundingClientRect().height < 4 &&
    activeEl.getBoundingClientRect().width < 4
  ) {
    const fallback = PROFILE_NAV_ITEMS.find(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.height >= 4 && r.width >= 4;
    });
    if (fallback) current = fallback.id;
  }
  return current;
}

function NavItem({
  id,
  label,
  active,
  count,
  compact,
  onSelect,
}: {
  id: string;
  label: string;
  active: boolean;
  count?: number;
  compact?: boolean;
  onSelect: (id: string) => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onSelect(id);
    window.history.replaceState(null, "", `#${id}`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  if (compact) {
    return (
      <a
        href={`#${id}`}
        onClick={handleClick}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
          active
            ? "bg-emerald-600 text-white shadow-sm"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        }`}
        aria-current={active ? "location" : undefined}
      >
        {label}
        {count != null && count > 0 && (
          <span
            className={`inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ${
              active
                ? "bg-white/20 text-white"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {count}
          </span>
        )}
      </a>
    );
  }

  return (
    <a
      href={`#${id}`}
      onClick={handleClick}
      className={`flex items-center gap-2 rounded-lg border-l-2 py-2 pl-3 pr-2 text-[13px] transition ${
        active
          ? "border-emerald-500 bg-emerald-50/90 font-medium text-emerald-900 shadow-sm ring-1 ring-emerald-100"
          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
      aria-current={active ? "location" : undefined}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ProfileCountBadge count={count ?? 0} />
    </a>
  );
}

export function ProfileJumpNav({
  counts,
  onNavigate,
}: {
  counts?: ProfileNavCounts;
  onNavigate?: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState(() => {
    if (typeof window === "undefined") return PROFILE_NAV_ITEMS[0]?.id ?? "";
    return readHashId() ?? PROFILE_NAV_ITEMS[0]?.id ?? "";
  });
  const clickLockUntil = useRef(0);

  const selectSection = useCallback(
    (id: string) => {
      clickLockUntil.current = Date.now() + CLICK_LOCK_MS;
      setActiveId(id);
      onNavigate?.(id);
    },
    [onNavigate],
  );

  useEffect(() => {
    const syncFromScroll = () => {
      if (Date.now() < clickLockUntil.current) return;
      const next = resolveActiveSection();
      setActiveId(next);
    };

    const onHashChange = () => {
      const id = readHashId();
      if (id) {
        clickLockUntil.current = Date.now() + CLICK_LOCK_MS;
        setActiveId(id);
      }
    };

    syncFromScroll();
    window.addEventListener("scroll", syncFromScroll, { passive: true });
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("scroll", syncFromScroll);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  // Single root so CSS Grid gets one sticky column (fragments break sticky).
  return (
    <div className="min-w-0 lg:sticky lg:top-20 lg:z-30 lg:self-start">
      {/* Mobile / tablet: chips stay under the site nav while scrolling */}
      <div className="sticky top-16 z-30 -mx-1 border-b border-slate-200/60 bg-[var(--background)]/95 px-1 pb-2 pt-1 backdrop-blur-md lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto">
          {PROFILE_NAV_ITEMS.map(({ id, label }) => (
            <NavItem
              key={id}
              id={id}
              label={label}
              active={activeId === id}
              count={counts?.[id]}
              compact
              onSelect={selectSection}
            />
          ))}
        </div>
      </div>

      {/* Desktop: vertical sections menu */}
      <nav
        className="hidden w-[11.5rem] rounded-xl border border-slate-200/70 bg-white/95 p-2 shadow-sm backdrop-blur-sm lg:block"
        aria-label="Profile sections"
      >
        <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Sections
        </p>
        <div className="space-y-0.5">
          {PROFILE_NAV_ITEMS.map(({ id, label }) => (
            <NavItem
              key={id}
              id={id}
              label={label}
              active={activeId === id}
              count={counts?.[id]}
              onSelect={selectSection}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
