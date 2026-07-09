"use client";

import { useState, type ReactNode } from "react";
import { ProfileCountBadge } from "@/components/ProfileCountBadge";

export const PROFILE_SECTION_SCROLL = "scroll-mt-28";

export function ProfileSection({
  id,
  title,
  description,
  count,
  defaultOpen = true,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  count?: number;
  complete?: boolean;
  defaultOpen?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className={PROFILE_SECTION_SCROLL}>
      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3.5 text-left transition hover:bg-slate-50/80 sm:px-5"
            aria-expanded={open}
          >
            <h2 className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span className="truncate">{title}</span>
              <ProfileCountBadge count={count ?? 0} />
            </h2>
            <span className="shrink-0 text-slate-400">{open ? "▾" : "▸"}</span>
          </button>
          {action && !open && (
            <div className="hidden shrink-0 pr-4 sm:block">{action}</div>
          )}
        </div>

        {open && (
          <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
            {description && (
              <p className="mb-4 text-sm text-slate-500">{description}</p>
            )}
            {action && <div className="mb-4 flex justify-end">{action}</div>}
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
