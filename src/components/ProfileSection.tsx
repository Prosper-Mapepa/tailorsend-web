"use client";

import { useState, type ReactNode } from "react";

/** Matches sticky jump-nav offset (top-28) when scrolling to anchors. */
export const PROFILE_SECTION_SCROLL = "scroll-mt-28";

export function ProfileSection({
  id,
  title,
  description,
  count,
  complete,
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
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex items-start gap-2 border-b border-transparent sm:gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50/80 sm:px-5"
            aria-expanded={open}
          >
            <span
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                complete
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {complete ? "✓" : "·"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {title}
                </h2>
                {typeof count === "number" && count > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/60">
                    {count}
                  </span>
                )}
              </div>
              {description && (
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
                  {description}
                </p>
              )}
            </div>
            <span className="shrink-0 pt-0.5 text-sm text-slate-400">
              {open ? "▾" : "▸"}
            </span>
          </button>
          {action && !open && (
            <div className="hidden shrink-0 py-4 pr-4 sm:block sm:pr-5">
              {action}
            </div>
          )}
        </div>

        {open && (
          <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
            {action && (
              <div className="mb-4 flex justify-end">{action}</div>
            )}
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
