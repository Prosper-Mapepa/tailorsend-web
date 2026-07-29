"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  openCompanyApplyTab,
  shouldOpenApplyTabForUser,
} from "@/lib/apply/open-apply-tab";
import { buildExtensionPdfAttachments } from "@/lib/download";
import {
  pingTailorSendExtension,
  requestExtensionFill,
} from "@/lib/extension-bridge";
import { isCopyableField } from "@/lib/form-field-utils";
import type { FormFieldResponse } from "@/lib/types";

/** Hero CTA for the Apply step — extension fill (prod) + server autofill. */
export function AutofillHero({
  busy,
  disabled,
  disabledReason,
  onAutofill,
  onPreview,
  applyUrl,
  applicationId,
  fields = [],
  resumeMarkdown = "",
  coverMarkdown = "",
  downloadSlug = "application",
  companyName = "",
}: {
  busy: boolean;
  disabled: boolean;
  disabledReason?: string | null;
  onAutofill: () => void;
  onPreview: () => void;
  applyUrl?: string | null;
  applicationId?: string | null;
  fields?: FormFieldResponse[];
  resumeMarkdown?: string;
  coverMarkdown?: string;
  downloadSlug?: string;
  companyName?: string;
}) {
  const openUserTab = shouldOpenApplyTabForUser();
  const [extensionReady, setExtensionReady] = useState(false);
  const [extensionBusy, setExtensionBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copyable = fields.filter(isCopyableField);
  const canExtensionFill = Boolean(applyUrl?.trim() && copyable.length > 0);

  useEffect(() => {
    let cancelled = false;
    pingTailorSendExtension().then((ok) => {
      if (!cancelled) setExtensionReady(ok);
    });
    const onReady = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (
        event.data?.source === "tailorsend-extension" &&
        event.data?.type === "READY"
      ) {
        setExtensionReady(true);
      }
    };
    window.addEventListener("message", onReady);
    return () => {
      cancelled = true;
      window.removeEventListener("message", onReady);
    };
  }, []);

  function startAutofill() {
    if (openUserTab && applyUrl) openCompanyApplyTab(applyUrl);
    onAutofill();
  }

  function startPreview() {
    if (openUserTab && applyUrl) openCompanyApplyTab(applyUrl);
    onPreview();
  }

  async function fillWithExtension() {
    if (!applyUrl?.trim()) {
      setError("No apply page URL for this job.");
      return;
    }
    if (copyable.length === 0) {
      setError("Generate form answers below first, then fill with the extension.");
      return;
    }
    setExtensionBusy(true);
    setError(null);
    setNote(null);
    try {
      let pdfs: Awaited<ReturnType<typeof buildExtensionPdfAttachments>> = {};
      try {
        pdfs = await buildExtensionPdfAttachments({
          resumeMarkdown,
          coverMarkdown,
          companyName,
          downloadSlug,
        });
      } catch {
        // Text fill still works if PDF generation fails.
      }
      const res = await requestExtensionFill({
        applicationId: applicationId ?? undefined,
        applyUrl,
        fields: copyable.map((f) => ({
          label: f.label,
          fieldType: f.fieldType,
          answer: f.answer,
        })),
        ...pdfs,
      });
      if (!res.ok) {
        setError(
          res.error ||
            "Install TailorSend Fill: chrome://extensions → Load unpacked → extension/",
        );
        return;
      }
      const extras = [
        res.uploadedResume ? "resume" : null,
        res.uploadedCover ? "cover" : null,
      ].filter(Boolean);
      setNote(
        res.filled
          ? `Filled ${res.filledCount ?? 0} field(s)${
              extras.length ? ` · attached ${extras.join(" & ")}` : ""
            } in Chrome. Review the apply tab, then submit.`
          : "Opened the apply page. Click Apply on that site if needed, then use Re-fill in the extension popup.",
      );
    } finally {
      setExtensionBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-green-50/80 shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Signature feature
          </div>
          <h3 className="mt-2.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Fill &amp; submit
          </h3>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-600">
            {openUserTab ? (
              <>
                <strong>Fill with extension</strong> opens the real company form
                in Chrome, fills your answers, and attaches resume/cover PDFs when
                file fields are detected. You review and submit. Server auto-fill
                is a preview backup when the extension isn’t installed.
              </>
            ) : (
              <>
                Locally, server auto-fill can open Google Chrome and fill the
                form. On production, use the Chrome extension for the real
                apply tab.
              </>
            )}
          </p>
          {disabled && disabledReason && (
            <p className="mt-2 text-sm font-medium text-amber-700">
              {disabledReason}
            </p>
          )}
          {error && (
            <p className="mt-2 text-sm font-medium text-amber-800">{error}</p>
          )}
          {note && !error && (
            <p className="mt-2 text-sm font-medium text-emerald-800">{note}</p>
          )}
          {openUserTab && !extensionReady && (
            <p className="mt-2 text-xs text-slate-500">
              Extension not detected — open{" "}
              <code className="text-[11px]">chrome://extensions</code>, Load
              unpacked → <code className="text-[11px]">extension/</code>, then
              refresh. Or see{" "}
              <a href="/extension" className="font-medium text-emerald-700 hover:underline">
                install guide
              </a>
              .
            </p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:min-w-[15rem]">
          {openUserTab && (
            <Button
              size="lg"
              onClick={() => void fillWithExtension()}
              disabled={disabled || busy || extensionBusy || !canExtensionFill}
              className="w-full bg-emerald-600 px-6 text-base shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
            >
              {extensionBusy
                ? "Preparing PDFs…"
                : "Fill with extension"}
            </Button>
          )}
          <Button
            size={openUserTab ? "md" : "lg"}
            onClick={startAutofill}
            disabled={disabled || busy || extensionBusy}
            className={
              openUserTab
                ? "w-full"
                : "w-full bg-emerald-600 px-6 text-base shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
            }
            variant={openUserTab ? "secondary" : "primary"}
          >
            <span className="inline-flex items-center gap-2">
              {!openUserTab && (
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M11.983 1.904a.75.75 0 00-1.292-.657l-7.25 9.5A.75.75 0 003.75 12h5.558l-1.291 6.096a.75.75 0 001.292.657l7.25-9.5A.75.75 0 0016.25 8h-5.558l1.291-6.096z" />
                </svg>
              )}
              {busy ? "Auto-filling…" : openUserTab ? "Server preview fill" : "Start auto-fill"}
            </span>
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={startPreview}
              disabled={disabled || busy || extensionBusy}
            >
              Preview only
            </Button>
            {applyUrl && !disabled && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full">
                  Open page
                </Button>
              </a>
            )}
          </div>
          {openUserTab && !canExtensionFill && !disabled && (
            <p className="text-center text-[11px] text-slate-500">
              Generate answers below to enable extension fill.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
