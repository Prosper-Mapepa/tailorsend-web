import { ProductPreviewCarousel } from "@/components/ProductPreviewCarousel";
import { SiteLogo } from "@/components/SiteLogo";

const WORKFLOW = [
  {
    step: 1,
    label: "Find jobs",
    short: "Search & score",
    highlight: false,
    featured: false,
  },
  {
    step: 2,
    label: "Company research",
    short: "Intel per employer",
    highlight: true,
    featured: false,
  },
  {
    step: 3,
    label: "Suggest gaps",
    short: "Honest fixes",
    highlight: true,
    featured: false,
  },
  {
    step: 4,
    label: "Resume & cover",
    short: "Woven in",
    highlight: true,
    featured: false,
  },
  {
    step: 5,
    label: "Autofill",
    short: "Greenhouse · Lever & more",
    highlight: true,
    featured: true,
  },
  {
    step: 6,
    label: "You submit",
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
            : "border-white/10 bg-white/[0.05]"
      }`}
    >
      {item.featured && (
        <span className="absolute -top-2.5 left-3 rounded-full bg-lime-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-950">
          Smart autofill
        </span>
      )}
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold sm:h-9 sm:w-9 sm:text-sm ${
          item.featured
            ? "bg-lime-400 text-emerald-950"
            : item.highlight
              ? "bg-emerald-400 text-emerald-950"
              : "bg-white/10 text-white/55"
        }`}
      >
        {item.step}
      </span>
      <p
        className={`mt-2 text-sm font-semibold leading-snug sm:text-[15px] ${
          item.featured || item.highlight ? "text-white" : "text-white/80"
        }`}
      >
        {item.label}
      </p>
      <p
        className={`mt-0.5 text-[11px] leading-snug sm:text-xs ${
          item.featured
            ? "text-lime-200/90"
            : item.highlight
              ? "text-emerald-200/75"
              : "text-white/42"
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

      <h1 className="mt-6 text-[2.1rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-[2.75rem] lg:text-[3.25rem]">
        Gaps you can fix -{" "}
        <span className="bg-gradient-to-r from-emerald-200 to-green-300 bg-clip-text text-transparent">
          added to your application.
        </span>
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/58 sm:text-lg lg:mx-0">
        TailorSend researches each employer, suggests honest gap fixes, tailors
        your resume and cover letter — then{" "}
        <span className="font-medium text-lime-200">
          auto-fills real ATS forms
        </span>{" "}
        for your review before you submit.
      </p>
    </div>
  );
}

export function MarketingFeatures() {
  return (
    <ul className="space-y-3 text-base text-white/62 sm:text-[17px]">
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
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm ${
                accent
                  ? "bg-lime-400/25 text-lime-300"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {accent ? "⚡" : "✓"}
            </span>
            <span className={accent ? "font-medium text-lime-100/90" : ""}>
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
    <div className="brand-glass w-full rounded-3xl border border-white/15 p-5 shadow-xl shadow-emerald-950/25 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
          Your Application Workflow
        </p>
        <p className="text-xs text-white/45">6 steps · you click submit last</p>
      </div>

      <ol className="mt-5 grid list-none grid-cols-2 gap-2.5 pt-1 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6 lg:gap-3">
        {WORKFLOW.map((item) => (
          <li key={item.label} className={item.featured ? "lg:col-span-1" : ""}>
            <WorkflowStep item={item} />
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-lime-400/25 bg-gradient-to-r from-lime-500/15 to-emerald-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-sm font-semibold text-lime-200">
            ⚡ Smart autofill — you stay in control
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/55 sm:text-sm">
            We fill applications in a real browser — work auth, EEO, resume
            upload, Save &amp; Continue flows. You review every field; we never
            click submit.
          </p>
        </div>
        <p className="shrink-0 text-xs font-medium text-lime-300/80">
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
  return <SiteLogo size="lg" variant="dark" className="gap-3" />;
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
