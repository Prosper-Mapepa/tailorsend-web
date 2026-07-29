/** @typedef {{ label: string; fieldType: string; answer: string }} FormField */
/** @typedef {{ filename: string; base64: string; mimeType?: string }} PdfAttachment */

const STORAGE_KEY = "tailorsendPendingFill";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "TAILORSEND_PING") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return true;
  }

  if (message.type === "TAILORSEND_FILL_REQUEST") {
    handleFillRequest(message.payload)
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({ ok: false, error: err?.message || String(err) }),
      );
    return true;
  }

  if (message.type === "TAILORSEND_FILL_ACTIVE_TAB") {
    handleFillActiveTab(message.payload)
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({ ok: false, error: err?.message || String(err) }),
      );
    return true;
  }

  if (message.type === "TAILORSEND_GET_PENDING") {
    chrome.storage.session.get(STORAGE_KEY).then((data) => {
      sendResponse({ ok: true, pending: data[STORAGE_KEY] ?? null });
    });
    return true;
  }

  if (message.type === "TAILORSEND_CLEAR_PENDING") {
    chrome.storage.session.remove(STORAGE_KEY).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

/**
 * @param {{
 *   applicationId?: string;
 *   applyUrl: string;
 *   fields: FormField[];
 *   resumePdf?: PdfAttachment;
 *   coverPdf?: PdfAttachment;
 * }} payload
 */
async function handleFillRequest(payload) {
  const applyUrl = String(payload?.applyUrl || "").trim();
  const fields = Array.isArray(payload?.fields) ? payload.fields : [];
  const resumePdf = normalizePdf(payload?.resumePdf);
  const coverPdf = normalizePdf(payload?.coverPdf);

  if (!applyUrl) {
    return { ok: false, error: "Missing apply URL." };
  }
  if (fields.length === 0 && !resumePdf && !coverPdf) {
    return {
      ok: false,
      error: "No form answers or PDFs to fill. Generate answers in TailorSend first.",
    };
  }

  const pending = {
    applicationId: payload.applicationId || null,
    applyUrl,
    fields,
    resumePdf,
    coverPdf,
    createdAt: Date.now(),
  };

  try {
    await chrome.storage.session.set({ [STORAGE_KEY]: pending });
  } catch {
    // PDFs can exceed session quota; keep a slim pending for re-fill of text fields.
    await chrome.storage.session.set({
      [STORAGE_KEY]: {
        applicationId: pending.applicationId,
        applyUrl,
        fields,
        createdAt: pending.createdAt,
      },
    });
  }

  const tab = await chrome.tabs.create({ url: applyUrl, active: true });

  const tabId = tab.id;
  if (tabId == null) {
    return { ok: true, opened: true, filled: false };
  }

  await wait(1800);
  const fillResult = await tryFillTab(tabId, fields, resumePdf, coverPdf, 6);

  return {
    ok: true,
    opened: true,
    filled: Boolean(fillResult?.ok),
    filledCount: fillResult?.filledCount ?? 0,
    skippedCount: fillResult?.skippedCount ?? 0,
    uploadedResume: Boolean(fillResult?.uploadedResume),
    uploadedCover: Boolean(fillResult?.uploadedCover),
    error: fillResult?.error,
  };
}

/**
 * Re-run fill on the current active tab using pending (or provided) fields.
 * @param {{
 *   fields?: FormField[];
 *   resumePdf?: PdfAttachment;
 *   coverPdf?: PdfAttachment;
 * } | undefined} payload
 */
async function handleFillActiveTab(payload) {
  const stored = await chrome.storage.session.get(STORAGE_KEY);
  const pending = stored[STORAGE_KEY];
  const fields =
    (Array.isArray(payload?.fields) && payload.fields.length
      ? payload.fields
      : pending?.fields) || [];
  const resumePdf =
    normalizePdf(payload?.resumePdf) || normalizePdf(pending?.resumePdf);
  const coverPdf =
    normalizePdf(payload?.coverPdf) || normalizePdf(pending?.coverPdf);

  if (!fields.length && !resumePdf && !coverPdf) {
    return { ok: false, error: "No pending TailorSend answers to fill." };
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, error: "No active tab." };
  }

  const fillResult = await tryFillTab(tab.id, fields, resumePdf, coverPdf, 4);
  return {
    ok: Boolean(fillResult?.ok),
    opened: false,
    filled: Boolean(fillResult?.ok),
    filledCount: fillResult?.filledCount ?? 0,
    skippedCount: fillResult?.skippedCount ?? 0,
    uploadedResume: Boolean(fillResult?.uploadedResume),
    uploadedCover: Boolean(fillResult?.uploadedCover),
    error: fillResult?.error,
  };
}

/** @param {unknown} pdf */
function normalizePdf(pdf) {
  if (!pdf || typeof pdf !== "object") return null;
  const filename = String(/** @type {{ filename?: string }} */ (pdf).filename || "").trim();
  const base64 = String(/** @type {{ base64?: string }} */ (pdf).base64 || "").trim();
  if (!filename || !base64) return null;
  return {
    filename,
    base64,
    mimeType:
      String(/** @type {{ mimeType?: string }} */ (pdf).mimeType || "").trim() ||
      "application/pdf",
  };
}

/**
 * @param {number} tabId
 * @param {FormField[]} fields
 * @param {PdfAttachment | null} resumePdf
 * @param {PdfAttachment | null} coverPdf
 * @param {number} attempts
 */
async function tryFillTab(tabId, fields, resumePdf, coverPdf, attempts) {
  let lastError = "Could not fill the page.";
  let lastResult = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: fillFormInPage,
        args: [fields, resumePdf, coverPdf],
      });
      lastResult = result;
      if (
        result?.ok &&
        ((result.filledCount ?? 0) > 0 ||
          result.uploadedResume ||
          result.uploadedCover)
      ) {
        return result;
      }
      lastError = result?.error || lastError;
    } catch (err) {
      lastError = err?.message || String(err);
    }
    await wait(1500);
  }
  return (
    lastResult || {
      ok: false,
      error: lastError,
      filledCount: 0,
      skippedCount: 0,
      uploadedResume: false,
      uploadedCover: false,
    }
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs in the page context (via chrome.scripting). Keep self-contained.
 * @param {FormField[]} fields
 * @param {PdfAttachment | null} resumePdf
 * @param {PdfAttachment | null} coverPdf
 */
function fillFormInPage(fields, resumePdf, coverPdf) {
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[*:\s]+/g, " ")
      .replace(/[^a-z0-9 +/@.-]/g, "")
      .trim();
  }

  function labelForControl(el) {
    if (!el) return "";
    const aria = el.getAttribute("aria-label");
    if (aria) return aria;
    if (el.id) {
      const byFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (byFor) return byFor.innerText || byFor.textContent || "";
    }
    const wrap = el.closest("label");
    if (wrap) return wrap.innerText || wrap.textContent || "";
    const parent = el.closest(
      "div, li, fieldset, .form-group, .field, [class*='question'], [class*='field']",
    );
    if (parent) {
      const lab = parent.querySelector("label, legend, [class*='label'], span");
      if (lab) return lab.innerText || lab.textContent || "";
    }
    return el.name || el.placeholder || "";
  }

  function scoreMatch(fieldLabel, controlLabel) {
    const a = norm(fieldLabel);
    const b = norm(controlLabel);
    if (!a || !b) return 0;
    if (a === b) return 100;
    if (b.includes(a) || a.includes(b)) return 80;
    const aw = a.split(" ").filter((w) => w.length > 2);
    const bw = new Set(b.split(" ").filter((w) => w.length > 2));
    if (!aw.length) return 0;
    let hit = 0;
    for (const w of aw) if (bw.has(w)) hit++;
    return Math.round((hit / aw.length) * 60);
  }

  function setNativeValue(el, value) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    desc?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillSelect(sel, answer) {
    const want = norm(answer);
    const opts = Array.from(sel.options);
    let match =
      opts.find((o) => norm(o.text) === want) ||
      opts.find((o) => norm(o.value) === want) ||
      opts.find((o) => norm(o.text).includes(want) || want.includes(norm(o.text)));
    if (!match && /^(yes|y|true)$/i.test(answer)) {
      match = opts.find((o) => /^yes$/i.test(o.text.trim()));
    }
    if (!match && /^(no|n|false)$/i.test(answer)) {
      match = opts.find((o) => /^no$/i.test(o.text.trim()));
    }
    if (!match) return false;
    sel.value = match.value;
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function fillCheckboxOrRadio(el, answer) {
    const wantYes = /^(yes|y|true|1|on|checked)$/i.test(String(answer).trim());
    const wantNo = /^(no|n|false|0|off)$/i.test(String(answer).trim());
    if (el.type === "radio") {
      const group = document.querySelectorAll(
        `input[type="radio"][name="${CSS.escape(el.name)}"]`,
      );
      for (const r of group) {
        const lab = norm(labelForControl(r));
        if (
          (wantYes && /yes|agree/.test(lab)) ||
          (wantNo && /no|disagree/.test(lab)) ||
          scoreMatch(answer, lab) >= 70
        ) {
          r.checked = true;
          r.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
      }
      return false;
    }
    if (wantYes && !el.checked) {
      el.click();
      return true;
    }
    if (wantNo && el.checked) {
      el.click();
      return true;
    }
    return false;
  }

  function base64ToFile(pdf) {
    const binary = atob(pdf.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], pdf.filename, {
      type: pdf.mimeType || "application/pdf",
    });
  }

  function classifyFileInput(el) {
    const blob = norm(
      [
        labelForControl(el),
        el.name,
        el.id,
        el.getAttribute("aria-label"),
        el.accept,
        el.getAttribute("data-testid"),
      ]
        .filter(Boolean)
        .join(" "),
    );
    const isCover =
      /cover\s*letter/.test(blob) ||
      (/cover/.test(blob) && /letter|upload|attach|file|pdf|document/.test(blob));
    const isResume =
      /resume|r\u00e9sum\u00e9|curriculum|vitae|\bcv\b/.test(blob) ||
      (/upload|attach|file|pdf|document/.test(blob) && /resume|cv/.test(blob));
    if (isCover && !isResume) return "cover";
    if (isResume) return "resume";
    if (isCover) return "cover";
    return "unknown";
  }

  function attachFile(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return input.files && input.files.length > 0;
  }

  function visible(el) {
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  const controls = Array.from(
    document.querySelectorAll("input, textarea, select"),
  ).filter((el) => {
    if (el instanceof HTMLInputElement) {
      if (el.type === "hidden" || el.type === "submit" || el.type === "button") {
        return false;
      }
      if (el.type === "file") return false;
      if (el.disabled || el.readOnly) return false;
    }
    if (el instanceof HTMLTextAreaElement && (el.disabled || el.readOnly)) {
      return false;
    }
    if (el instanceof HTMLSelectElement && el.disabled) return false;
    return visible(el);
  });

  let filledCount = 0;
  let skippedCount = 0;
  const used = new Set();

  for (const field of fields || []) {
    const answer = String(field.answer || "").trim();
    const type = String(field.fieldType || "").toLowerCase();
    if (!answer) {
      skippedCount++;
      continue;
    }
    if (type === "file") {
      skippedCount++;
      continue;
    }

    let best = null;
    let bestScore = 0;
    for (const el of controls) {
      if (used.has(el)) continue;
      const score = scoreMatch(field.label, labelForControl(el));
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    if (!best || bestScore < 45) {
      skippedCount++;
      continue;
    }

    used.add(best);
    try {
      if (best instanceof HTMLSelectElement) {
        if (fillSelect(best, answer)) filledCount++;
        else skippedCount++;
      } else if (
        best instanceof HTMLInputElement &&
        (best.type === "checkbox" || best.type === "radio")
      ) {
        if (fillCheckboxOrRadio(best, answer)) filledCount++;
        else skippedCount++;
      } else {
        setNativeValue(best, answer);
        filledCount++;
      }
    } catch {
      skippedCount++;
    }
  }

  let uploadedResume = false;
  let uploadedCover = false;

  const fileInputs = Array.from(
    document.querySelectorAll('input[type="file"]'),
  ).filter((el) => !el.disabled && visible(el));

  if ((resumePdf || coverPdf) && fileInputs.length) {
    const resumeFile = resumePdf ? base64ToFile(resumePdf) : null;
    const coverFile = coverPdf ? base64ToFile(coverPdf) : null;
    const usedFiles = new Set();

    function pickBest(kind) {
      let best = null;
      let bestScore = -1;
      for (const el of fileInputs) {
        if (usedFiles.has(el)) continue;
        const classified = classifyFileInput(el);
        let score = 0;
        if (classified === kind) score = 100;
        else if (classified === "unknown") score = 20;
        else score = 0;
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      }
      return bestScore >= 20 ? best : null;
    }

    if (resumeFile) {
      const el = pickBest("resume");
      if (el && attachFile(el, resumeFile)) {
        usedFiles.add(el);
        uploadedResume = true;
      }
    }

    if (coverFile) {
      const el = pickBest("cover");
      if (el && attachFile(el, coverFile)) {
        usedFiles.add(el);
        uploadedCover = true;
      }
    }

    // Fallback: single unlabeled file input → resume
    if (resumeFile && !uploadedResume && fileInputs.length === 1 && !usedFiles.has(fileInputs[0])) {
      if (attachFile(fileInputs[0], resumeFile)) uploadedResume = true;
    }
  }

  const ok = filledCount > 0 || uploadedResume || uploadedCover;
  return {
    ok,
    filledCount,
    skippedCount,
    uploadedResume,
    uploadedCover,
    error: ok
      ? undefined
      : "No matching fields or file uploads found on this page yet (try Apply, then click Fill again from the extension popup).",
  };
}
