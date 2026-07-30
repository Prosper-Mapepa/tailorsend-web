/** @typedef {{ label: string; fieldType: string; answer: string }} FormField */
/** @typedef {{ filename: string; base64: string; mimeType?: string }} PdfAttachment */

const PENDING_KEY = "tailorsendPendingFill";
const AUTH_KEY = "tailorsendAuth";
const DEFAULT_API_BASE = "https://tailorsend.cc";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "TAILORSEND_PING") {
    getAuth().then((auth) => {
      sendResponse({
        ok: true,
        version: chrome.runtime.getManifest().version,
        signedIn: Boolean(auth?.token),
      });
    });
    return true;
  }

  if (message.type === "TAILORSEND_AUTH_SYNC") {
    syncAuth(message.payload)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
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

  if (message.type === "TAILORSEND_MATCH_PAGE") {
    matchPage(message.payload?.url)
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({ ok: false, error: err?.message || String(err) }),
      );
    return true;
  }

  if (message.type === "TAILORSEND_FILL_APPLICATION") {
    fillApplicationOnActiveTab(message.payload)
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({ ok: false, error: err?.message || String(err) }),
      );
    return true;
  }

  if (message.type === "TAILORSEND_GET_PENDING") {
    chrome.storage.session.get(PENDING_KEY).then((data) => {
      sendResponse({ ok: true, pending: data[PENDING_KEY] ?? null });
    });
    return true;
  }

  if (message.type === "TAILORSEND_CLEAR_PENDING") {
    chrome.storage.session.remove(PENDING_KEY).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

async function getAuth() {
  const data = await chrome.storage.local.get(AUTH_KEY);
  return data[AUTH_KEY] || null;
}

async function syncAuth(payload) {
  const token = String(payload?.token || "").trim() || null;
  const apiBase = String(payload?.apiBase || DEFAULT_API_BASE).replace(/\/$/, "") || DEFAULT_API_BASE;
  if (!token) {
    await chrome.storage.local.remove(AUTH_KEY);
    return { ok: true, signedIn: false };
  }
  await chrome.storage.local.set({
    [AUTH_KEY]: { token, apiBase, syncedAt: Date.now() },
  });
  return { ok: true, signedIn: true, apiBase };
}

async function apiFetch(path, init = {}) {
  const auth = await getAuth();
  if (!auth?.token) {
    const err = new Error("Sign in at tailorsend.cc to connect the extension.");
    err.code = "AUTH";
    throw err;
  }
  const base = auth.apiBase || DEFAULT_API_BASE;
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${auth.token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (res.status === 401) {
    const err = new Error("Session expired. Sign in again at tailorsend.cc.");
    err.code = "AUTH";
    throw err;
  }
  return res;
}

async function matchPage(pageUrl) {
  const url = String(pageUrl || "").trim();
  if (!url) return { ok: false, error: "Missing page URL." };

  const auth = await getAuth();
  if (!auth?.token) {
    return {
      ok: false,
      auth: false,
      error: "Sign in at tailorsend.cc (this extension syncs automatically).",
    };
  }

  const res = await apiFetch(`/api/applications/match?url=${encodeURIComponent(url)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      auth: true,
      error: data.error || `Match failed (${res.status})`,
    };
  }
  return {
    ok: true,
    auth: true,
    matches: data.matches || [],
    best: data.best || null,
  };
}

/**
 * Overlay: fill the current tab from a TailorSend application id.
 */
async function fillApplicationOnActiveTab(payload) {
  const applicationId = String(payload?.applicationId || "").trim();
  if (!applicationId) return { ok: false, error: "No application selected." };

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: "No active tab." };

  const pack = await loadFillPack(applicationId);
  await storePending({
    applicationId,
    applyUrl: payload?.pageUrl || tab.url || pack.applyUrl,
    fields: pack.fields,
    resumePdf: pack.resumePdf,
    coverPdf: pack.coverPdf,
    createdAt: Date.now(),
  });

  const fillResult = await tryFillTab(
    tab.id,
    pack.fields,
    pack.resumePdf,
    pack.coverPdf,
    5,
  );

  return {
    ok: Boolean(fillResult?.ok),
    filled: Boolean(fillResult?.ok),
    filledCount: fillResult?.filledCount ?? 0,
    skippedCount: fillResult?.skippedCount ?? 0,
    uploadedResume: Boolean(fillResult?.uploadedResume),
    uploadedCover: Boolean(fillResult?.uploadedCover),
    error: fillResult?.error,
  };
}

async function loadFillPack(applicationId) {
  const res = await apiFetch(`/api/applications/${applicationId}/fill-pack`);
  const pack = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(pack.error || "Could not load application.");
  }

  const fields = Array.isArray(pack.fields) ? pack.fields : [];
  const copyable = fields.filter(
    (f) =>
      f &&
      String(f.fieldType || "").toLowerCase() !== "file" &&
      String(f.answer || "").trim(),
  );

  const company = pack.company || "Application";
  const slug =
    String(company)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "application";

  let resumePdf = null;
  let coverPdf = null;
  if (String(pack.resumeMarkdown || "").trim()) {
    resumePdf = await buildPdfAttachment({
      markdown: pack.resumeMarkdown,
      title: `Resume — ${company}`,
      filename: `resume-${slug}.pdf`,
      kind: "resume",
    });
  }
  if (String(pack.coverMarkdown || "").trim()) {
    coverPdf = await buildPdfAttachment({
      markdown: pack.coverMarkdown,
      title: `Cover letter — ${company}`,
      filename: `cover-letter-${slug}.pdf`,
      kind: "cover",
    });
  }

  return {
    applyUrl: pack.applyUrl || "",
    fields: copyable.map((f) => ({
      label: f.label,
      fieldType: f.fieldType,
      answer: f.answer,
    })),
    resumePdf,
    coverPdf,
  };
}

async function buildPdfAttachment({ markdown, title, filename, kind }) {
  const res = await apiFetch("/api/tailor/pdf", {
    method: "POST",
    body: JSON.stringify({ markdown, title, filename, kind }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "PDF generation failed.");
  }
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    filename,
    base64: btoa(binary),
    mimeType: "application/pdf",
  };
}

async function storePending(pending) {
  try {
    await chrome.storage.session.set({ [PENDING_KEY]: pending });
  } catch {
    await chrome.storage.session.set({
      [PENDING_KEY]: {
        applicationId: pending.applicationId,
        applyUrl: pending.applyUrl,
        fields: pending.fields,
        createdAt: pending.createdAt,
      },
    });
  }
}

function normalizePdf(pdf) {
  if (!pdf || typeof pdf !== "object") return null;
  const filename = String(pdf.filename || "").trim();
  const base64 = String(pdf.base64 || "").trim();
  if (!filename || !base64) return null;
  return {
    filename,
    base64,
    mimeType: String(pdf.mimeType || "").trim() || "application/pdf",
  };
}

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

  await storePending({
    applicationId: payload.applicationId || null,
    applyUrl,
    fields,
    resumePdf,
    coverPdf,
    createdAt: Date.now(),
  });

  const tab = await chrome.tabs.create({ url: applyUrl, active: true });
  const tabId = tab.id;
  if (tabId == null) {
    return { ok: true, opened: true, filled: false };
  }

  await wait(2200);
  const fillResult = await tryFillTab(tabId, fields, resumePdf, coverPdf, 8);

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

async function handleFillActiveTab(payload) {
  const stored = await chrome.storage.session.get(PENDING_KEY);
  const pending = stored[PENDING_KEY];
  const fields =
    (Array.isArray(payload?.fields) && payload.fields.length
      ? payload.fields
      : pending?.fields) || [];
  const resumePdf =
    normalizePdf(payload?.resumePdf) || normalizePdf(pending?.resumePdf);
  const coverPdf =
    normalizePdf(payload?.coverPdf) || normalizePdf(pending?.coverPdf);

  if (!fields.length && !resumePdf && !coverPdf) {
    // Fallback: match current tab to TailorSend apps
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && tab.id != null) {
      const matched = await matchPage(tab.url);
      if (matched.ok && matched.best?.id) {
        return fillApplicationOnActiveTab({
          applicationId: matched.best.id,
          pageUrl: tab.url,
        });
      }
    }
    return { ok: false, error: "No pending TailorSend answers to fill." };
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, error: "No active tab." };
  }

  const fillResult = await tryFillTab(tab.id, fields, resumePdf, coverPdf, 5);
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

async function tryFillTab(tabId, fields, resumePdf, coverPdf, attempts) {
  let lastError = "Could not fill the page.";
  let lastResult = null;
  for (let i = 0; i < attempts; i++) {
    try {
      // Prefer main frame; also try all frames (Greenhouse iframes).
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: fillFormInPage,
        args: [fields, resumePdf, coverPdf],
      });
      const merged = {
        ok: false,
        filledCount: 0,
        skippedCount: 0,
        uploadedResume: false,
        uploadedCover: false,
        error: undefined,
      };
      for (const row of results || []) {
        const r = row?.result;
        if (!r) continue;
        merged.filledCount += r.filledCount || 0;
        merged.skippedCount += r.skippedCount || 0;
        merged.uploadedResume = merged.uploadedResume || Boolean(r.uploadedResume);
        merged.uploadedCover = merged.uploadedCover || Boolean(r.uploadedCover);
      }
      merged.ok =
        merged.filledCount > 0 || merged.uploadedResume || merged.uploadedCover;
      lastResult = merged;
      if (merged.ok) return merged;
      lastError = merged.error || lastError;
    } catch (err) {
      lastError = err?.message || String(err);
    }
    await wait(1600);
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
 * Runs in the page / frame context. Keep self-contained.
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
      try {
        const byFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (byFor) return byFor.innerText || byFor.textContent || "";
      } catch {
        /* ignore */
      }
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
      try {
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
      } catch {
        return false;
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

    if (!best || bestScore < 40) {
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

    if (
      resumeFile &&
      !uploadedResume &&
      fileInputs.length === 1 &&
      !usedFiles.has(fileInputs[0])
    ) {
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
      : "No matching fields found yet — open the Apply form, then click Fill again.",
  };
}
