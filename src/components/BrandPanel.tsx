import { ProductPreviewCarousel } from "@/components/ProductPreviewCarousel";
import { SiteLogo } from "@/components/SiteLogo";

const WORKFLOW = [
  {
    step: 1,
    label: "Find Jobs",
    short: "Search & score",
    highlight: false,
    featured: false,
  },
  {
    step: 2,
    label: "Company Research",
    short: "Intel per employer",
    highlight: true,
    featured: false,
  },
  {
    step: 3,
    label: "Suggest Gaps",
    short: "Honest fixes",
    highlight: true,
    featured: false,
  },
  {
    step: 4,
    label: "Resume & Cover",
    short: "Woven in",
    highlight: true,
    featured: false,
  },
  {
    step: 5,
    label: "Autofill Forms",
    short: "Greenhouse · Lever & more",
    highlight: true,
    featured: true,
  },
  {
    step: 6,
    label: "You Submit",
    short: "Your approval",
    highlight: false,
    featured: false,
  },
] as const;

function WorkflowStep({ item }: { item: (typeof WORKFLOW)[number] }) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border px-3 py-3 sm:px-4 sm:py-4 ${
        item.featured
          ? "border-lime-400/50 bg-gradient-to-b from-lime-400/25 via-emerald-500/20 to-emerald-500/10 shadow-xl shadow-lime-900/30 ring-1 ring-lime-400/30 lg:min-h-[130px]"
          : item.highlight
            ? "border-emerald-400/40 bg-gradient-to-b from-emerald-500/30 to-emerald-500/10 shadow-lg shadow-emerald-950/25"
            : "border-white/50 bg-white/[0.05]"
      }`}
    >
      {item.featured && (
        <span className="absolute -top-2.5 left-3 rounded-full bg-lime-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-950 sm:text-xs">
          Smart autofill
        </span>
      )}
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold sm:h-10 sm:w-10 sm:text-base ${
          item.featured
            ? "bg-lime-400 text-emerald-950"
            : item.highlight
              ? "bg-emerald-400 text-emerald-950"
              : "bg-white/10 text-white/80"
        }`}
      >
        {item.step}
      </span>
      <p
        className={`mt-2.5 text-base font-semibold leading-snug sm:text-lg ${
          item.featured || item.highlight ? "text-white" : "text-white/90"
        }`}
      >
        {item.label}
      </p>
      <p
        className={`mt-1 text-sm leading-snug sm:text-base ${
          item.featured
            ? "text-lime-100"
            : item.highlight
              ? "text-emerald-100/90"
              : "text-white/70"
        }`}
      >
        {item.short}
      </p>
    </div>
  );
}

export function MarketingHero() {
  return (
    <div className="text-center lg:text-left">
      {/* <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-1 text-xs font-semibold text-emerald-200">
        Research Company · Identify Gaps · Tailor · Autofill · Submit
      </p> */}

      <h1 className="mt-6 text-[2.35rem] font-bold leading-[1.08] tracking-tight text-emerald-100 sm:text-[3rem] lg:text-[3.5rem]">
        <span className="rounded bg-emerald-200 px-1.5 text-emerald-900">
          Gaps
        </span>{" "}
        you can fix - added to your application.
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl lg:mx-0">
        TailorSend researches each employer, suggests honest gap fixes, tailors
        your resume and cover letter — then{" "}
        <span className="font-semibold text-lime-100">
          auto-fills real ATS forms
        </span>{" "}
        for your review before you submit.
      </p>
    </div>
  );
}

export function MarketingFeatures() {
  return (
    <ul className="space-y-4 text-lg text-white/85 sm:text-xl">
      {[
        {
          text: "Smart autofill for Greenhouse, Lever & multi-step ATS forms",
          accent: true,
        },
        "Gap fixes from side projects, coursework & past roles",
        "Woven into resume and cover letter before you submit",
        "Never invents experience — you approve every field, then click submit",
      ].map((item) => {
        const text = typeof item === "string" ? item : item.text;
        const accent = typeof item === "object" && item.accent;
        return (
          <li key={text} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base sm:h-8 sm:w-8 sm:text-lg ${
                accent
                  ? "bg-lime-400/25 text-lime-200"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {accent ? "⚡" : "✓"}
            </span>
            <span className={accent ? "font-semibold text-lime-50" : "text-white/90"}>
              {text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ServiceWorkflow() {
  return (
    <div className="brand-glass w-full rounded-3xl border border-white/20 p-6 shadow-xl shadow-emerald-950/25 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200 sm:text-base">
          Your Application Workflow
        </p>
        <p className="text-sm text-white/65 sm:text-base">6 steps · you click submit last</p>
      </div>

      <ol className="mt-6 grid list-none grid-cols-2 gap-3 pt-1 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 lg:gap-4">
        {WORKFLOW.map((item) => (
          <li key={item.label} className={item.featured ? "lg:col-span-1" : ""}>
            <WorkflowStep item={item} />
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-lime-400/30 bg-gradient-to-r from-lime-500/20 to-emerald-500/15 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-base font-semibold text-lime-100 sm:text-lg">
            ⚡ Smart autofill — you stay in control
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
            We fill applications in a real browser — work auth, EEO, resume
            upload, Save &amp; Continue flows. You review every field; we never
            click submit.
          </p>
        </div>
        <p className="shrink-0 text-sm font-medium text-lime-200 sm:text-base">
          Greenhouse · Lever · more
        </p>
      </div>
    </div>
  );
}

export function MarketingPreview() {
  return (
    <div className="w-full">
      <ProductPreviewCarousel />
    </div>
  );
}

/** @deprecated Use MarketingHero + MarketingFeatures + ServiceWorkflow */
export function MarketingCopy() {
  return (
    <div className="space-y-6">
      <MarketingHero />
      <MarketingFeatures />
      <div className="hidden lg:block">
        <MarketingPreview />
      </div>
    </div>
  );
}

export function AuthLogo() {
  return <SiteLogo size="lg" variant="dark" className="gap-2" />;
}

/** @deprecated Use MarketingHero + MarketingFeatures + ServiceWorkflow */
export function AuthBrandContent() {
  return (
    <div className="w-full space-y-10">
      <MarketingHero />
      <ServiceWorkflow />
      <MarketingFeatures />
    </div>
  );
}
