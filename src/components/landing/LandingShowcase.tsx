"use client";

import { useEffect, useState } from "react";

type Frame =
  | {
      kind: "bars";
      label: string;
      title: string;
      detail: string;
      metric: string;
      bars: [number, number, number];
      barLabels: [string, string, string];
    }
  | {
      kind: "research";
      label: string;
      title: string;
      detail: string;
      metric: string;
      bullets: string[];
    }
  | {
      kind: "gaps";
      label: string;
      title: string;
      detail: string;
      metric: string;
      before: number;
      after: number;
      matched: string[];
      missing: string[];
      unfillable: string;
    }
  | {
      kind: "suggest";
      label: string;
      title: string;
      detail: string;
      metric: string;
      suggestions: { gap: string; fix: string }[];
      skip?: string;
    }
  | {
      kind: "tailored";
      label: string;
      title: string;
      detail: string;
      metric: string;
      resumeLines: string[];
      coverSnippet: string;
    };

const FRAMES: Frame[] = [
  {
    kind: "bars",
    label: "Search",
    title: "47 roles matched",
    detail: "Greenhouse · Lever · RemoteOK",
    metric: "94% top match",
    bars: [94, 88, 81],
    barLabels: ["Match score", "Keywords", "Progress"],
  },
  {
    kind: "research",
    label: "Research",
    title: "Stripe intel loaded",
    detail: "Researched for this application",
    metric: "Fresh per company — not a template",
    bullets: [
      "Recent launch: usage-based billing APIs",
      "Culture: high bar, written culture",
      "Interview angle: your payments side project",
    ],
  },
  {
    kind: "gaps",
    label: "Gaps",
    title: "3 keywords missing",
    detail: "Stripe · Backend Engineer · 62% match",
    metric: "Next: we suggest honest fixes",
    before: 62,
    after: 92,
    matched: ["Python", "REST APIs", "distributed systems"],
    missing: ["Kubernetes", "Terraform", "payments APIs"],
    unfillable: "5+ yrs fintech — not in your history",
  },
  {
    kind: "suggest",
    label: "Suggest",
    title: "3 gaps you can fix",
    detail: "From your profile + this job description",
    metric: "Accept → added to resume & cover",
    suggestions: [
      { gap: "Kubernetes", fix: "Your homelab cluster on GKE" },
      { gap: "Terraform", fix: "AWS infra coursework project" },
      { gap: "Payments APIs", fix: "Expand your side-project bullet" },
    ],
    skip: "5+ yrs fintech — can't honestly claim",
  },
  {
    kind: "tailored",
    label: "Resume",
    title: "Gap fixes woven in",
    detail: "Resume + cover letter ready to submit",
    metric: "92% match · no invented experience",
    resumeLines: [
      "✓ Kubernetes: homelab cluster on GKE (gap fix)",
      "✓ Terraform: provisioned AWS infra in coursework",
      "Led API migration cutting latency 40%",
    ],
    coverSnippet:
      "Stripe's usage-based billing launch mirrors my payments API project…",
  },
  {
    kind: "bars",
    label: "Submit",
    title: "12 fields filled",
    detail: "Greenhouse · awaiting your review",
    metric: "You click submit",
    bars: [40, 72, 100],
    barLabels: ["Autofill", "Reviewed", "Your control"],
  },
];

export function LandingShowcase() {
  const [frame, setFrame] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setAnimate(false);
      setTimeout(() => {
        setFrame((f) => (f + 1) % FRAMES.length);
        setAnimate(true);
      }, 200);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const current = FRAMES[frame]!;

  return (
    <div className="relative">
      <div className="landing-showcase-glow absolute -inset-10 rounded-full opacity-60" />

      <div className="landing-showcase-card relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-emerald-900/[0.08]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            tailorsend.app
          </span>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/80 p-2">
          {FRAMES.map((f, i) => (
            <div
              key={f.label}
              className={`min-w-0 flex-1 rounded-xl px-1.5 py-2 text-center transition-all duration-300 ${
                i === frame
                  ? "bg-white shadow-sm ring-1 ring-emerald-200"
                  : "text-slate-400"
              }`}
            >
              <p
                className={`truncate text-[9px] font-semibold uppercase tracking-wide sm:text-[10px] ${
                  i === frame ? "text-emerald-700" : ""
                }`}
              >
                {f.label}
              </p>
            </div>
          ))}
        </div>

        <div
          className={`min-h-[280px] p-6 transition-all duration-300 ${animate ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            {current.label}
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            {current.title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{current.detail}</p>

          {current.kind === "bars" && (
            <div className="mt-6 space-y-3">
              {current.barLabels.map((label, i) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                    <span>{label}</span>
                    <span className="font-semibold text-emerald-600">
                      {current.bars[i]}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700 ease-out"
                      style={{
                        width: animate ? `${current.bars[i]}%` : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {current.kind === "research" && (
            <ul className="mt-6 space-y-2.5">
              {current.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                >
                  <span className="mt-0.5 text-emerald-500">→</span>
                  {b}
                </li>
              ))}
            </ul>
          )}

          {current.kind === "gaps" && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold text-slate-400 line-through">
                  {current.before}%
                </span>
                <span className="text-emerald-500">→</span>
                <span className="text-3xl font-semibold text-emerald-600">
                  {current.after}%
                </span>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Matched
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {current.matched.map((k) => (
                    <span
                      key={k}
                      className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100"
                    >
                      ✓ {k}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Still missing — fix if true
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {current.missing.map((k) => (
                    <span
                      key={k}
                      className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-100"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Can&apos;t count: {current.unfillable}
              </p>
            </div>
          )}

          {current.kind === "suggest" && (
            <ul className="mt-6 space-y-2">
              {current.suggestions.map((s) => (
                <li
                  key={s.gap}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-sm"
                >
                  <span className="font-semibold text-emerald-800">{s.gap}</span>
                  <span className="text-slate-500"> → </span>
                  <span className="text-slate-700">{s.fix}</span>
                </li>
              ))}
              {current.skip && (
                <li className="px-3 py-1 text-xs text-slate-400 line-through">
                  ✗ {current.skip}
                </li>
              )}
            </ul>
          )}

          {current.kind === "tailored" && (
            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Resume
                </p>
                <ul className="mt-2 space-y-1">
                  {current.resumeLines.map((line) => (
                    <li key={line} className="text-xs text-slate-700">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Cover letter
                </p>
                <p className="mt-2 text-xs italic text-slate-600">
                  &ldquo;{current.coverSnippet}&rdquo;
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
            <span className="landing-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {current.metric}
          </div>
        </div>
      </div>

      <div className="landing-float-card absolute -bottom-6 -left-4 hidden rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-xl sm:block">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Gap suggestions
        </p>
        <p className="text-sm font-semibold text-slate-900">Fixes from your real experience</p>
      </div>

      <div className="landing-float-card-delay absolute -right-2 -top-4 hidden rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-xl sm:block">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Resume & cover
        </p>
        <p className="text-sm font-semibold text-emerald-700">Woven in for submission</p>
      </div>
    </div>
  );
}
