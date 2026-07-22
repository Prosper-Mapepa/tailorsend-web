"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

async function copyText(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.062 2.062 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function OutreachBlock({
  channel,
  label,
  hint,
  value,
  onChange,
  rows,
  maxLength,
  minHeight,
}: {
  channel: "linkedin" | "email";
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  maxLength?: number;
  minHeight: number;
}) {
  const [copied, setCopied] = useState(false);
  const isLinkedIn = channel === "linkedin";

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm ${
        isLinkedIn
          ? "border-[#0a66c2]/20 ring-1 ring-[#0a66c2]/5"
          : "border-slate-200"
      }`}
    >
      <div
        className={`flex items-start justify-between gap-3 border-b px-4 py-3 ${
          isLinkedIn ? "border-[#0a66c2]/10 bg-[#0a66c2]/[0.04]" : "border-slate-100 bg-slate-50/80"
        }`}
      >
        <div className="flex min-w-0 gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              isLinkedIn
                ? "bg-[#0a66c2] text-white"
                : "bg-slate-800 text-white"
            }`}
          >
            {isLinkedIn ? (
              <LinkedInIcon className="h-4 w-4" />
            ) : (
              <MailIcon className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">{hint}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {maxLength != null && (
            <span
              className={`text-xs tabular-nums ${
                value.length > maxLength * 0.9
                  ? "font-medium text-amber-600"
                  : "text-slate-400"
              }`}
            >
              {value.length}/{maxLength}
            </span>
          )}
          <Button
            type="button"
            variant={copied ? "primary" : "secondary"}
            size="sm"
            disabled={!value.trim()}
            onClick={async () => {
              const ok = await copyText(value);
              if (ok) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        spellCheck
        placeholder={
          isLinkedIn
            ? "Short note for a connection request or InMail…"
            : "Subject line and email body…"
        }
        style={{ minHeight }}
        className="w-full resize-y border-0 bg-white px-4 py-3.5 text-[13px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/30"
      />
    </section>
  );
}

export function RecruiterOutreachPanel({
  jobTitle,
  company,
  linkedInNote,
  recruiterEmail,
  onLinkedInChange,
  onEmailChange,
  embedded = false,
}: {
  jobTitle: string;
  company: string;
  linkedInNote: string;
  recruiterEmail: string;
  onLinkedInChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  /** When true, always show fields (workflow step); no outer card or duplicate title. */
  embedded?: boolean;
}) {
  if (!embedded && !linkedInNote.trim() && !recruiterEmail.trim()) {
    return null;
  }

  const contextBar = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-sm">
      <span className="font-medium text-slate-900">{company}</span>
      <span className="hidden text-slate-300 sm:inline" aria-hidden>
        ·
      </span>
      <span className="text-slate-600">{jobTitle}</span>
      <span className="ml-auto text-xs text-slate-500">
        Edit, then copy into each channel
      </span>
    </div>
  );

  const grid = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-5">
      <OutreachBlock
        channel="linkedin"
        label="LinkedIn"
        hint="Connection note or InMail — aim for under 300 characters."
        value={linkedInNote}
        onChange={onLinkedInChange}
        rows={5}
        maxLength={300}
        minHeight={140}
      />
      <OutreachBlock
        channel="email"
        label="Recruiter email"
        hint="Subject + body — paste into Gmail or Outlook."
        value={recruiterEmail}
        onChange={onEmailChange}
        rows={14}
        minHeight={320}
      />
    </div>
  );

  if (embedded) {
    return (
      <div className="-mx-1 space-y-4 sm:mx-0">
        {contextBar}
        {grid}
      </div>
    );
  }

  return (
    <Card className="border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white">
      <div className="mb-4 space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Recruiter outreach
        </h2>
        {contextBar}
      </div>
      {grid}
    </Card>
  );
}
