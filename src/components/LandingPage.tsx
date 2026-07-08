import Link from "next/link";
import { JobBoardMarquee } from "@/components/landing/JobBoardMarquee";
import { LandingShowcase } from "@/components/landing/LandingShowcase";
import { SiteLogo } from "@/components/SiteLogo";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { Button } from "@/components/ui";

const PIPELINE = [
  {
    num: "1",
    title: "Find & score",
    desc: "Scan ATS boards and rank roles against your real skills.",
  },
  {
    num: "2",
    title: "Research the company",
    desc: "Fresh intel per employer — news, culture, and interview angles for this application.",
  },
  {
    num: "3",
    title: "Suggest & tailor",
    desc: "Get gap fixes you can honestly make — we weave them into your resume and cover letter.",
  },
  {
    num: "4",
    title: "Autofill & review",
    desc: "We fill the form in a browser. You verify, then submit yourself.",
  },
];

const BENTO = [
  {
    size: "lg",
    title: "Gap suggestions you can act on",
    desc: "We flag missing JD keywords and suggest honest fixes from your side projects, coursework, and past roles — never invented experience.",
    accent: "bg-slate-900 text-white",
  },
  {
    size: "lg",
    title: "Woven into resume & cover",
    desc: "Accept a suggestion and it lands in your tailored resume bullets and cover letter — ready for autofill and submission.",
    accent: "bg-emerald-600 text-white",
  },
  {
    size: "sm",
    title: "Never auto-submits",
    desc: "You verify every field, then click submit.",
    accent: "bg-white",
  },
  {
    size: "sm",
    title: "Visa-aware search",
    desc: "Filter sponsorship risk before you invest time.",
    accent: "bg-white",
  },
  {
    size: "md",
    title: "Multi-step autofill",
    desc: "Greenhouse, Lever & more — including Save & Continue flows.",
    accent: "bg-emerald-50",
  },
  {
    size: "sm",
    title: ".edu pricing",
    desc: "5 tailor + 2 autofill free monthly. Packs from $6.",
    accent: "bg-white",
  },
];

const DIFFERENTIATORS = [
  {
    icon: "🔍",
    title: "Research for every company",
    desc: "Fresh news, culture signals, and interview angles for each employer — fuel for gap suggestions and your cover letter.",
  },
  {
    icon: "💡",
    title: "Gap suggestions you can fix",
    desc: "We compare your resume to the job description and suggest honest fixes: cite a homelab project for Kubernetes, expand a side project for payments APIs, and skip what you can't truthfully claim.",
  },
  {
    icon: "✍️",
    title: "Added to resume & cover letter",
    desc: "Accept a suggestion and TailorSend weaves it into your tailored resume and cover letter — then auto-fills the application for your review before submit.",
  },
];

export function LandingPage() {
  return (
    <div className="landing-page -mx-4 -mt-8 bg-[#f8faf8] sm:-mx-6 sm:-mt-10">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/50 bg-[#f8faf8]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <SiteLogo size="md" variant="brand" />
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link href="/register">
              <Button size="sm">Get started free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="landing-hero-blob pointer-events-none absolute -right-32 top-0 h-[500px] w-[500px] rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="landing-hero-blob-delay pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-teal-200/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              💡 Suggests gap fixes · adds them to resume & cover
            </p>

            <h1 className="mt-8 text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]">
              Gaps you can fix —{" "}
              <span className="relative">
                <span className="relative z-10 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                  woven into every application.
                </span>
                <span className="absolute -bottom-1 left-0 h-3 w-full bg-emerald-200/60 -skew-x-3" />
              </span>
            </h1>

            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600">
              TailorSend researches each company, suggests gap fixes from your
              real experience, and weaves them into your resume and cover letter
              — then auto-fills the form for your review.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="shadow-lg shadow-emerald-600/20">
                  Start free
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="secondary">
                  Sign in
                </Button>
              </Link>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-slate-200/80 pt-8">
              {[
                { v: "100%", l: "per-company research" },
                { v: "+30", l: "avg match lift" },
                { v: "0", l: "auto-submits" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="text-2xl font-semibold text-slate-900">{s.v}</dt>
                  <dd className="mt-0.5 text-xs leading-snug text-slate-500">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <LandingShowcase />
        </div>
      </section>

      <JobBoardMarquee />

      {/* Manifesto */}
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Our promise
          </p>
          <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Suggest the gaps.{" "}
            <span className="text-white/50">
              Weave them in. You submit.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/55">
            Generic AI rewriters guess. TailorSend researches each employer,
            suggests gap fixes you can honestly make, and adds them to your
            resume and cover letter — then auto-fills the form and waits for
            your review.
          </p>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Why TailorSend
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900">
            What other tools skip — we do for every application.
          </h2>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {DIFFERENTIATORS.map((d) => (
              <div
                key={d.title}
                className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm"
              >
                <span className="text-3xl">{d.icon}</span>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">
                  {d.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {d.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            How it works
          </p>
          <h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight text-slate-900">
            Four steps. One stronger application.
          </h2>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((step, i) => (
              <div key={step.num} className="relative">
                {i < PIPELINE.length - 1 && (
                  <div className="absolute left-[calc(50%+2rem)] top-8 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-emerald-300 to-transparent md:block" />
                )}
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-lg shadow-emerald-600/25">
                  {step.num}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento features */}
      <section className="border-t border-slate-200/60 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Everything in one workflow
          </h2>
          <p className="mt-3 max-w-xl text-slate-600">
            Company research, gap analysis, tailoring, and autofill — without
            juggling five different tools.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENTO.map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl border border-slate-200/80 p-6 ${
                  item.size === "lg" ? "sm:col-span-2 lg:row-span-1" : ""
                } ${item.accent}`}
              >
                <h3
                  className={`font-semibold ${
                    item.accent.includes("text-white")
                      ? "text-white"
                      : "text-slate-900"
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    item.accent.includes("text-white")
                      ? "text-white/70"
                      : "text-slate-500"
                  }`}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student CTA */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-green-700 p-8 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-emerald-100">
                Students · .edu emails
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                5 tailor + 2 autofill kits free every month
              </h2>
              <p className="mt-3 text-emerald-100/80">
                No credit card. Upgrade with credit packs from $6 when you need
                more volume during recruiting season.
              </p>
            </div>
            <Link href="/register" className="mt-8 inline-block shrink-0 lg:mt-0">
              <Button
                size="lg"
                className="bg-white text-emerald-800 shadow-xl hover:bg-emerald-50"
              >
                Create free account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <SiteLogo size="sm" variant="brand" />
              <p className="mt-3 max-w-xs text-sm text-slate-500">
                Gap suggestions woven into resume and cover letter — human
                review before every submit.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-500">
              <Link href="/terms" className="hover:text-emerald-600">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-emerald-600">
                Privacy
              </Link>
              <Link href="/sign-in" className="hover:text-emerald-600">
                Sign in
              </Link>
              <a
                href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                className="hover:text-emerald-600"
              >
                {LEGAL_CONTACT_EMAIL}
              </a>
            </nav>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} TailorSend. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
