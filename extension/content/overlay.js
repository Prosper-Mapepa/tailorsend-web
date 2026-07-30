/**
 * Always-on TailorSend panel on company apply pages (FrogHire-style).
 * Fetches matching applications via the background worker (auth token).
 */
(function () {
  const ROOT_ID = "tailorsend-overlay-root";
  if (document.getElementById(ROOT_ID)) return;

  /** Skip TailorSend itself and non-http pages. */
  try {
    const h = location.hostname;
    if (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "tailorsend.cc" ||
      h.endsWith(".tailorsend.cc") ||
      h === "chrome.google.com"
    ) {
      return;
    }
  } catch {
    return;
  }

  function looksLikeApplyPage() {
    const href = location.href.toLowerCase();
    const path = location.pathname.toLowerCase();
    if (
      /greenhouse|lever\.co|ashbyhq|myworkdayjobs|icims|jobvite|smartrecruiters|bamboohr|careers\.|\/jobs\/|\/apply|gh_jid=/.test(
        href,
      )
    ) {
      return true;
    }
    const fileInputs = document.querySelectorAll('input[type="file"]').length;
    const formish =
      document.querySelectorAll(
        "form input, form textarea, form select, input[name], textarea[name]",
      ).length;
    if (fileInputs > 0 && formish >= 3) return true;
    if (formish >= 6 && /apply|application|career|job/.test(path + document.title.toLowerCase())) {
      return true;
    }
    return formish >= 8;
  }

  const state = {
    open: false,
    loading: false,
    filling: false,
    auth: false,
    matches: [],
    selectedId: null,
    error: null,
    note: null,
    probed: false,
  };

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.style.cssText =
    "all:initial;position:fixed;z-index:2147483646;right:16px;bottom:16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;";
  document.documentElement.appendChild(root);

  const shadow = root.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; }
    .pill {
      display:flex;align-items:center;gap:8px;padding:10px 14px;border:0;border-radius:999px;
      background:#064e3b;color:#ecfdf5;font:700 13px/1 system-ui,sans-serif;cursor:pointer;
      box-shadow:0 10px 30px rgba(6,78,59,.35);
    }
    .pill:hover { background:#047857; }
    .dot { width:8px;height:8px;border-radius:50%;background:#34d399;flex-shrink:0; }
    .dot.warn { background:#fbbf24; }
    .dot.bad { background:#f87171; }
    .panel {
      width:min(360px,calc(100vw - 32px));background:#fff;color:#0f172a;border-radius:16px;
      box-shadow:0 18px 50px rgba(15,23,42,.28);overflow:hidden;border:1px solid #e2e8f0;
      margin-bottom:10px;
    }
    .head { display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:#ecfdf5;border-bottom:1px solid #d1fae5; }
    .brand { font:800 13px/1.2 system-ui;color:#064e3b;letter-spacing:.02em; }
    .sub { font:500 11px/1.3 system-ui;color:#047857;margin-top:3px; }
    .x { border:0;background:transparent;color:#64748b;font:700 16px/1 system-ui;cursor:pointer;padding:4px; }
    .body { padding:12px 14px;max-height:min(420px,55vh);overflow:auto; }
    .msg { font:500 12px/1.45 system-ui;color:#475569;margin:0 0 10px; }
    .err { font:600 12px/1.4 system-ui;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:8px 10px;margin:0 0 10px; }
    .ok { font:600 12px/1.4 system-ui;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:8px 10px;margin:0 0 10px; }
    .card {
      display:block;width:100%;text-align:left;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;
      background:#fff;cursor:pointer;margin:0 0 8px;font:inherit;color:inherit;
    }
    .card:hover { border-color:#6ee7b7; }
    .card.on { border-color:#10b981;background:#f0fdf4; }
    .co { font:700 13px/1.2 system-ui;color:#0f172a; }
    .ti { font:500 12px/1.35 system-ui;color:#64748b;margin-top:3px; }
    .meta { font:500 11px/1.3 system-ui;color:#059669;margin-top:6px; }
    .actions { display:flex;gap:8px;padding:0 14px 14px; }
    .btn {
      flex:1;border:0;border-radius:10px;padding:11px 12px;font:700 13px/1 system-ui;cursor:pointer;
    }
    .btn.primary { background:#059669;color:#fff; }
    .btn.primary:disabled { opacity:.55;cursor:not-allowed; }
    .btn.ghost { background:#f1f5f9;color:#334155; }
    a.link { color:#047857;font-weight:700;text-decoration:none; }
    a.link:hover { text-decoration:underline; }
  `;
  shadow.appendChild(style);

  const wrap = document.createElement("div");
  shadow.appendChild(wrap);

  function send(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(res || { ok: false, error: "No response" });
      });
    });
  }

  async function refreshMatches() {
    state.loading = true;
    state.error = null;
    render();
    const res = await send("TAILORSEND_MATCH_PAGE", { url: location.href });
    state.loading = false;
    state.probed = true;
    if (!res?.ok) {
      state.auth = Boolean(res?.auth);
      state.error = res?.error || "Could not load applications.";
      state.matches = [];
      render();
      return;
    }
    state.auth = true;
    state.matches = Array.isArray(res.matches) ? res.matches : [];
    state.selectedId = res.best?.id || state.matches[0]?.id || null;
    if (!state.matches.length) {
      state.error =
        "No TailorSend application matches this page. Tailor the job in TailorSend first, then return here.";
    }
    render();
  }

  async function fillSelected() {
    if (!state.selectedId) return;
    state.filling = true;
    state.error = null;
    state.note = null;
    render();
    const res = await send("TAILORSEND_FILL_APPLICATION", {
      applicationId: state.selectedId,
      pageUrl: location.href,
    });
    state.filling = false;
    if (!res?.ok) {
      state.error = res?.error || "Fill failed.";
      render();
      return;
    }
    const bits = [];
    if (res.filledCount) bits.push(`${res.filledCount} fields`);
    if (res.uploadedResume) bits.push("resume");
    if (res.uploadedCover) bits.push("cover");
    state.note = bits.length
      ? `Filled ${bits.join(" · ")}. Review, then submit on this site.`
      : "Ran fill — review the form (some sites need another pass after Apply).";
    render();
  }

  function render() {
    wrap.innerHTML = "";

    if (!state.open) {
      const pill = document.createElement("button");
      pill.className = "pill";
      pill.type = "button";
      const dot = document.createElement("span");
      dot.className =
        "dot" +
        (state.error && state.probed ? " bad" : state.auth || !state.probed ? "" : " warn");
      pill.appendChild(dot);
      pill.appendChild(
        document.createTextNode(
          state.matches.length
            ? `TailorSend · ${state.matches.length} match${state.matches.length === 1 ? "" : "es"}`
            : "TailorSend Fill",
        ),
      );
      pill.onclick = () => {
        state.open = true;
        render();
        if (!state.probed || !state.matches.length) void refreshMatches();
      };
      wrap.appendChild(pill);
      return;
    }

    const panel = document.createElement("div");
    panel.className = "panel";

    const head = document.createElement("div");
    head.className = "head";
    head.innerHTML =
      '<div><div class="brand">TailorSend Fill</div><div class="sub">Review answers, then submit yourself</div></div>';
    const close = document.createElement("button");
    close.className = "x";
    close.type = "button";
    close.textContent = "×";
    close.onclick = () => {
      state.open = false;
      render();
    };
    head.appendChild(close);
    panel.appendChild(head);

    const body = document.createElement("div");
    body.className = "body";

    if (state.loading) {
      body.innerHTML = '<p class="msg">Looking up your applications…</p>';
    } else {
      if (state.error) {
        const e = document.createElement("p");
        e.className = "err";
        e.textContent = state.error;
        body.appendChild(e);
      }
      if (state.note) {
        const n = document.createElement("p");
        n.className = "ok";
        n.textContent = state.note;
        body.appendChild(n);
      }
      if (!state.auth && state.probed) {
        const m = document.createElement("p");
        m.className = "msg";
        m.innerHTML =
          'Sign in at <a class="link" href="https://tailorsend.cc" target="_blank" rel="noreferrer">tailorsend.cc</a> to connect this extension, then reopen this panel.';
        body.appendChild(m);
      }
      for (const app of state.matches) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "card" + (app.id === state.selectedId ? " on" : "");
        btn.innerHTML = `<div class="co">${escapeHtml(app.company || "Company")}</div><div class="ti">${escapeHtml(app.title || "Role")}</div><div class="meta">${app.hasGeneratedAnswers ? "Tailored answers ready" : "Profile answers"} · ${app.fields?.length || 0} fields${app.hasResume ? " · resume" : ""}</div>`;
        btn.onclick = () => {
          state.selectedId = app.id;
          render();
        };
        body.appendChild(btn);
      }
      if (!state.matches.length && state.auth) {
        const m = document.createElement("p");
        m.className = "msg";
        m.innerHTML =
          'Open the job in TailorSend, tailor it, generate form answers, then click Fill here. <a class="link" href="https://tailorsend.cc" target="_blank" rel="noreferrer">Open TailorSend</a>';
        body.appendChild(m);
      }
    }
    panel.appendChild(body);

    const actions = document.createElement("div");
    actions.className = "actions";
    const refresh = document.createElement("button");
    refresh.className = "btn ghost";
    refresh.type = "button";
    refresh.textContent = "Refresh";
    refresh.disabled = state.loading || state.filling;
    refresh.onclick = () => void refreshMatches();
    const fill = document.createElement("button");
    fill.className = "btn primary";
    fill.type = "button";
    fill.textContent = state.filling ? "Filling…" : "Fill this form";
    fill.disabled = state.loading || state.filling || !state.selectedId;
    fill.onclick = () => void fillSelected();
    actions.append(refresh, fill);
    panel.appendChild(actions);

    wrap.appendChild(panel);

    const pill = document.createElement("button");
    pill.className = "pill";
    pill.type = "button";
    pill.innerHTML = '<span class="dot"></span>Hide panel';
    pill.onclick = () => {
      state.open = false;
      render();
    };
    wrap.appendChild(pill);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function boot() {
    if (!looksLikeApplyPage()) {
      // Still show a quiet pill on career hosts after a short delay if forms appear.
      setTimeout(() => {
        if (looksLikeApplyPage()) {
          render();
          void refreshMatches().then(() => {
            if (state.matches.length) {
              state.open = true;
              render();
            }
          });
        }
      }, 2500);
      return;
    }
    render();
    void refreshMatches().then(() => {
      // Auto-expand when we have a confident match (FrogHire-like presence).
      if (state.matches.length) {
        state.open = true;
        render();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
