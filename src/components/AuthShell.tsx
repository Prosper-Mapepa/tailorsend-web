"use client";

import Link from "next/link";
import {
  AuthLogo,
  MarketingFeatures,
  MarketingHero,
  MarketingPreview,
  ServiceWorkflow,
} from "@/components/BrandPanel";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { Button } from "@/components/ui";

function AuthCTACard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-white/20 bg-white p-6 shadow-2xl shadow-emerald-950/30 sm:p-8 ${className}`}
    >
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        Get started free
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-[15px]">
        Company research, gap suggestions, tailored documents — plus smart
        autofill for real ATS forms.
      </p>

      <div className="mt-6 space-y-3">
        <Link href="/register" className="block">
          <Button size="lg" className="w-full shadow-lg shadow-emerald-600/20">
            Create free account
          </Button>
        </Link>
        <Link href="/sign-in" className="block">
          <Button size="lg" variant="secondary" className="w-full">
            Sign in
          </Button>
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
        <p className="text-sm font-semibold text-emerald-900">
          Students · .edu emails
        </p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-800/80">
          Students get 4 tailor + 2 autofill kits free every month. No credit card.
        </p>
      </div>
    </div>
  );
}

function HeroCTAs() {
  return (
    <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
      <Link href="/register">
        <Button size="lg" className="shadow-lg shadow-emerald-600/25 text-xl">
          Create free account
        </Button>
      </Link>
      <Link href="/sign-in">
        <Button
          size="lg"
          variant="secondary"
          className="border-white/25 bg-white/10 text-white hover:bg-white/20 text-xl"
        >
          Sign in
        </Button>
      </Link>
    </div>
  );
}

export function AuthMarketingShell() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8 lg:px-12">
        <AuthLogo />
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/sign-in" className="hidden sm:block">
            <Button
              size="md"
              variant="secondary"
              className="border-white/20 bg-white/10 text-base text-white hover:bg-white/20"
            >
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="md" className="text-base">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 pb-10 sm:px-8 lg:px-12 lg:pb-14">
        <div className="mx-auto w-full max-w-7xl space-y-10 lg:space-y-14">
          {/* 1 — Hero title */}
          <section className="pt-6 lg:pt-10">
            <MarketingHero />
            <div className="mt-8">
              <HeroCTAs />
            </div>
          </section>

          {/* 2 — Workflow */}
          <section>
            <ServiceWorkflow />
          </section>

          {/* 3 — Features + CTA */}
          <section className="grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-12 xl:grid-cols-[1fr_420px]">
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  Why TailorSend is different
                </h2>
                <div className="mt-5">
                  <MarketingFeatures />
                </div>
              </div>
              <div className="lg:hidden">
                <AuthCTACard />
              </div>
              <div className="hidden lg:block">
                <MarketingPreview />
              </div>
            </div>
            <div className="hidden lg:block lg:sticky lg:top-8">
              <AuthCTACard />
            </div>
          </section>

          {/* 4 — Mobile preview */}
          <section className="lg:hidden">
            <MarketingPreview />
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-white/10 px-5 py-6 sm:px-8 lg:px-12">
        <p className="mx-auto max-w-7xl text-center text-sm leading-relaxed text-white/60 sm:text-base">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
          >
            Privacy Policy
          </Link>
          . Questions?{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </footer>
    </div>
  );
}

export function FormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 flex justify-center">
          <AuthLogo />
        </div>

        <header className="mb-8 text-center">
          {/* <h1 className="text-[1.75rem] font-semibold tracking-tight text-white">
            {title}
          </h1> */}
          {/* <p className="mt-2 text-[15px] leading-relaxed text-white/55">
            {subtitle}
          </p> */}
        </header>

        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl shadow-emerald-950/30 sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/40">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-emerald-300 underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-emerald-300 underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-sm text-white/45">
          <Link
            href="/"
            className="font-medium text-emerald-300 hover:text-emerald-200"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
