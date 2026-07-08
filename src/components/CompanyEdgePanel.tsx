"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import type { BuildIdea, CompanyEdge } from "@/lib/ai";
import { normalizeCompanyEdge } from "@/lib/ai";
import { sourceHostname, stripInlineCitations } from "@/lib/util";

export function CompanyEdgePanel({
  edge: rawEdge,
  company,
  onAdd,
  adding,
  addedMsg,
}: {
  edge: CompanyEdge;
  company: string;
  onAdd: (ideas: BuildIdea[]) => void;
  adding: boolean;
  addedMsg: string | null;
}) {
  const edge = useMemo(() => normalizeCompanyEdge(rawEdge), [rawEdge]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const allSelected =
    edge.build.length > 0 && selected.size === edge.build.length;
  const toggleAll = () =>
    setSelected(
      allSelected ? new Set() : new Set(edge.build.map((_, i) => i)),
    );

  const hasContent = edge.gap || edge.build.length || edge.research.length;
  if (!hasContent) return null;

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/60 to-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-4">
        <h3 className="text-base font-semibold text-slate-900">
          Your edge at {company || "this company"}
        </h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            edge.liveResearch
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-600"
          }`}
          title={
            edge.liveResearch
              ? "Based on live web research"
              : "Based on the model's knowledge (live web search unavailable) — verify recency"
          }
        >
          {edge.liveResearch ? "● Live research" : "● Model knowledge"}
        </span>
      </div>

      {edge.research.length > 0 && (
        <section className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            What&apos;s happening there
          </h4>
          <ul className="mt-2 space-y-2">
            {edge.research.map((r, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-slate-700"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{stripInlineCitations(r)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {edge.gap && (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            The gap you can fix
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">
            {edge.gap}
          </p>
        </section>
      )}

      {edge.build.length > 0 && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Build this to stand out
            </h4>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Select initiatives to add to your resume and cover letter.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {edge.build.map((b, i) => {
              const isSel = selected.has(i);
              return (
                <label
                  key={i}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition ${
                    isSel
                      ? "border-emerald-400 bg-emerald-50/80 ring-1 ring-emerald-300"
                      : "border-slate-200 bg-white hover:border-emerald-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggle(i)}
                    className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {b.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {b.description}
                    </p>
                    {b.impact && (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                          Why it stands out
                        </p>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-emerald-950">
                          {b.impact}
                        </p>
                      </div>
                    )}
                    {b.tech?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {b.tech.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              disabled={selected.size === 0 || adding}
              onClick={() =>
                onAdd(edge.build.filter((_, i) => selected.has(i)))
              }
            >
              {adding
                ? "Adding…"
                : `Add ${selected.size || ""} to resume & cover letter`}
            </Button>
            {addedMsg && (
              <span className="text-sm text-emerald-600">{addedMsg}</span>
            )}
          </div>
        </section>
      )}

      {edge.pitch && (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            How to position yourself
          </h4>
          <p className="mt-2 text-sm italic leading-relaxed text-slate-800">
            &ldquo;{edge.pitch}&rdquo;
          </p>
        </section>
      )}

      {edge.sources.length > 0 && (
        <section className="mt-5 border-t border-emerald-100 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sources
          </h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {edge.sources.map((s, i) => (
              <li key={`${s}-${i}`}>
                <a
                  href={s}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                  title={s}
                >
                  {sourceHostname(s)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
