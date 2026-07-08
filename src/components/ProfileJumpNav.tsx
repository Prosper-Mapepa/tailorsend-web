"use client";

import { useEffect, useState } from "react";

export type JumpNavItem = { id: string; label: string };

export function ProfileJumpNav({ items }: { items: readonly JumpNavItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-112px 0px -55% 0px",
        threshold: [0, 0.15, 0.4, 0.75],
      },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="hidden xl:sticky xl:top-28 xl:z-10 xl:block xl:self-start">
      <div className="max-h-[calc(100vh-8.5rem)] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-sm backdrop-blur-sm">
        <p className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Jump to
        </p>
        <div className="space-y-0.5">
          {items.map(({ id, label }) => {
            const active = activeId === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setActiveId(id)}
                className={`block rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                  active
                    ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
                aria-current={active ? "location" : undefined}
              >
                {label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
