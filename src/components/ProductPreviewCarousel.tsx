"use client";

import { useEffect, useState } from "react";

interface SolutionSlide {
  id: string;
  pill: string;
  context: string;
  title: string;
  subtitle: string;
  match?: number;
  activeTab: number;
  progress?: number;
  status: string;
  highlights: string[];
  accent: string;
}

const SOLUTIONS: SolutionSlide[] = [
  {
    id: "gaps",
    pill: "Gap analysis",
    context: "Match score · Stripe",
    title: "62% → 92% after tailor",
    subtitle: "See what's missing from the job description",
    match: 62,
    activeTab: 1,
    status: "Missing keywords flagged — next we suggest honest fixes",
    highlights: [
      "Matched: Python, distributed systems, REST APIs",
      "Missing: Kubernetes, Terraform, payments APIs",
      "Can't fake: 5+ yrs fintech (not in your history)",
      "▲ +30 pts possible after you accept suggestions",
    ],
    accent: "from-emerald-400 to-green-300",
  },
  {
    id: "suggest",
    pill: "Gap suggestions",
    context: "Suggestions · Stripe",
    title: "3 gaps you can fix",
    subtitle: "Pulled from the JD + your real profile",
    activeTab: 1,
    status: "Accept any suggestion — we add it to resume & cover letter",
    highlights: [
      "→ Kubernetes: cite your homelab cluster project",
      "→ Terraform: your AWS infra coursework applies",
      "→ Payments APIs: expand your side-project bullet",
      "✗ 5+ yrs fintech — skip (not in your background)",
    ],
    accent: "from-lime-400 to-emerald-300",
  },
  {
    id: "tailor",
    pill: "Resume tailored",
    context: "Resume · Stripe",
    title: "Senior Software Engineer",
    subtitle: "Gap fixes woven into bullets",
    match: 92,
    activeTab: 0,
    status: "Ready for submission — no invented experience",
    highlights: [
      "✓ Kubernetes: homelab cluster on GKE (gap fix added)",
      "✓ Terraform: provisioned AWS infra in coursework",
      "Led API migration cutting latency 40%",
      "Shipped React dashboards for 50k+ users",
    ],
    accent: "from-emerald-400 to-green-300",
  },
  {
    id: "autofill",
    pill: "Smart autofill",
    context: "Greenhouse · Dropbox",
    title: "Staff Infrastructure Engineer",
    subtitle: "87% filled · awaiting your review",
    match: 79,
    activeTab: 0,
    progress: 87,
    status: "We fill the form — you verify every field before submit",
    highlights: [
      "✓ Name, email, phone, location",
      "✓ Work authorization · sponsorship",
      "✓ Resume uploaded · EEO defaults applied",
      "✓ Save & Continue multi-step flows supported",
    ],
    accent: "from-lime-400 to-emerald-300",
  },
  {
    id: "cover",
    pill: "Cover letter",
    context: "Cover · Stripe",
    title: "Personalized for Stripe",
    subtitle: "Company research + gap fixes included",
    match: 88,
    activeTab: 1,
    status: "Research angles and gap fixes in one letter",
    highlights: [
      "Dear Hiring Manager,",
      "Stripe's usage-based billing launch mirrors my payments API project…",
      "My Terraform & Kubernetes experience (homelab, coursework) maps to your infra stack.",
    ],
    accent: "from-teal-400 to-emerald-300",
  },
  {
    id: "edge",
    pill: "Company research",
    context: "Research · Figma",
    title: "Your edge at Figma",
    subtitle: "Researched for this application",
    match: 85,
    activeTab: 2,
    status: "Intel feeds gap suggestions and cover letter angles",
    highlights: [
      "Config 2025: design systems at scale",
      "Culture: craft-led, dev-education focus",
      "Interview angle: plugin you built with Figma-like APIs",
      "Suggested build idea to close a real gap",
    ],
    accent: "from-green-400 to-emerald-400",
  },
  {
    id: "search",
    pill: "Multi-source search",
    context: "Jobs · 4 boards scanned",
    title: "47 strong matches today",
    subtitle: "Greenhouse · Lever · RemoteOK · WWR",
    match: 94,
    activeTab: 0,
    status: "Scored against your skills & target roles",
    highlights: [
      "Stripe — Backend Engineer — 94%",
      "Linear — Full Stack — 91%",
      "Vercel — Product Engineer — 87%",
    ],
    accent: "from-cyan-400 to-emerald-300",
  },
  {
    id: "student",
    pill: "Student pricing",
    context: "Free tier · .edu verified",
    title: "4 tailor + 2 autofill / month",
    subtitle: "Campus $5 · Monthly $8 · Sprint $8 .edu",
    activeTab: 0,
    status: "No card required to start — upgrade when you need more",
    highlights: [
      "4 free tailor kits for .edu every month",
      "Campus pack $5 · Student Monthly $8/mo",
      "Sprint pack $8 with .edu email",
    ],
    accent: "from-amber-300 to-emerald-300",
  },
  {
    id: "visa",
    pill: "Visa-aware filtering",
    context: "Filter · Sponsorship OK",
    title: "Roles that fit your status",
    subtitle: "H-1B · OPT · CPT friendly",
    match: 90,
    activeTab: 0,
    status: "Skip companies unlikely to sponsor",
    highlights: [
      "Visa risk scored per listing",
      "Autofill answers work-auth questions",
      "Sponsorship details saved in profile",
    ],
    accent: "from-violet-400 to-emerald-300",
  },
];

const TABS = ["Resume", "Cover", "Edge"];
const ROTATE_MS = 4500;

export function ProductPreviewCarousel() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [progressWidth, setProgressWidth] = useState(0);

  const slide = SOLUTIONS[index]!;

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % SOLUTIONS.length);
        setFade(true);
      }, 280);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (slide.progress == null) {
      setProgressWidth(0);
      return;
    }
    setProgressWidth(0);
    const t = setTimeout(() => setProgressWidth(slide.progress!), 120);
    return () => clearTimeout(t);
  }, [slide.id, slide.progress]);

  return (
    <div className="relative w-full">
      <div className="brand-glass relative overflow-hidden rounded-xl border border-white/10 p-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span
            key={slide.context}
            className={`text-[10px] font-medium uppercase tracking-wider text-white/40 transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
          >
            {slide.context}
          </span>
        </div>

        {/* Active solution pill */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span
            key={slide.pill}
            className={`inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 transition-all duration-300 ${fade ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
          >
            <span className="preview-pulse h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {slide.pill}
          </span>
          <div className="flex gap-1">
            {SOLUTIONS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show ${s.pill}`}
                onClick={() => {
                  setFade(false);
                  setTimeout(() => {
                    setIndex(i);
                    setFade(true);
                  }, 200);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-5 bg-emerald-400"
                    : "w-1.5 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        <div
          className={`mt-4 transition-all duration-300 ${fade ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{slide.title}</p>
              <p className="mt-0.5 text-xs text-white/50">{slide.subtitle}</p>

              {(slide.id === "tailor" ||
                slide.id === "cover" ||
                slide.id === "edge" ||
                slide.id === "gaps" ||
                slide.id === "suggest") && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(slide.id === "gaps" || slide.id === "suggest"
                    ? ["Match", "Gaps", "Edge"]
                    : TABS
                  ).map((tab, i) => (
                    <span
                      key={tab}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-300 ${
                        i ===
                        (slide.id === "gaps"
                          ? 1
                          : slide.id === "suggest"
                            ? 1
                            : slide.activeTab)
                          ? "bg-white/12 text-white"
                          : "text-white/35"
                      }`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 text-right">
              {slide.match != null && (
                <span className="inline-block rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  {slide.match}%
                </span>
              )}
              {slide.progress != null && (
                <div className="mt-2 w-28">
                  <div className="flex items-center justify-between text-[10px] text-white/45">
                    <span>Fill</span>
                    <span className="font-semibold text-emerald-300">
                      {slide.progress}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${slide.accent} transition-all duration-1000 ease-out`}
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-1.5 rounded-lg bg-black/20 px-3.5 py-3">
            {slide.highlights.map((line, i) => (
              <div
                key={`${slide.id}-${i}`}
                className="preview-line text-[11px] leading-relaxed text-white/70"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {line.startsWith("✓") ? (
                  <span className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    {line.slice(1).trim()}
                  </span>
                ) : line.startsWith("→") ? (
                  <span className="flex items-start gap-2 text-emerald-200/90">
                    <span className="shrink-0 text-emerald-400">→</span>
                    {line.slice(1).trim()}
                  </span>
                ) : line.startsWith("✗") ? (
                  <span className="flex items-start gap-2 text-white/40 line-through">
                    <span className="shrink-0">✗</span>
                    {line.slice(1).trim()}
                  </span>
                ) : (
                  <span
                    className={
                      i === 0 && slide.id === "cover"
                        ? "font-medium text-white/90"
                        : ""
                    }
                  >
                    {line}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] text-white/35">{slide.status}</p>
        </div>
      </div>
    </div>
  );
}
