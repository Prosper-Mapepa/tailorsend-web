"use client";

import Link from "next/link";
import { nextProfileStep, type ProfileCompletion } from "@/lib/profile-nav";

/** Slim nudge — only shown while core profile sections are still empty. */
export function ProfileProgress({
  completion,
}: {
  completion: ProfileCompletion;
}) {
  const next = nextProfileStep(completion);
  if (!next) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm">
      <p className="text-slate-600">
        <span className="font-medium text-slate-800">{next.label}</span>
        <span className="hidden sm:inline text-slate-500"> — {next.hint}</span>
      </p>
      <Link
        href={`#${next.id}`}
        className="shrink-0 font-medium text-emerald-600 hover:text-emerald-700"
      >
        Go →
      </Link>
    </div>
  );
}
