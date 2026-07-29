/**
 * Optional: if a pending fill exists for this origin, offer a floating button.
 * Primary fill is triggered from TailorSend via scripting.executeScript.
 */
(function () {
  const STORAGE_KEY = "tailorsendPendingFill";

  function sameHost(a, b) {
    try {
      return new URL(a).hostname === new URL(b).hostname;
    } catch {
      return false;
    }
  }

  async function maybeShowBanner() {
    const data = await chrome.storage.session.get(STORAGE_KEY);
    const pending = data[STORAGE_KEY];
    if (!pending?.applyUrl || !Array.isArray(pending.fields)) return;
    if (!sameHost(pending.applyUrl, location.href)) return;
    if (document.getElementById("tailorsend-fill-banner")) return;

    const bar = document.createElement("div");
    bar.id = "tailorsend-fill-banner";
    bar.style.cssText =
      "position:fixed;z-index:2147483647;left:16px;right:16px;bottom:16px;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:12px;background:#064e3b;color:#ecfdf5;font:600 13px/1.3 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.25)";
    bar.innerHTML =
      "<span>TailorSend has answers ready for this apply page.</span>";

    const btn = document.createElement("button");
    btn.textContent = "Fill form";
    btn.style.cssText =
      "border:0;border-radius:8px;background:#10b981;color:#064e3b;font:700 13px system-ui;padding:8px 12px;cursor:pointer";
    btn.onclick = () => {
      chrome.runtime.sendMessage(
        {
          type: "TAILORSEND_FILL_ACTIVE_TAB",
          payload: {
            fields: pending.fields,
            resumePdf: pending.resumePdf || null,
            coverPdf: pending.coverPdf || null,
          },
        },
        (res) => {
          const bits = [];
          if (res?.filledCount) bits.push(`${res.filledCount} fields`);
          if (res?.uploadedResume) bits.push("resume");
          if (res?.uploadedCover) bits.push("cover");
          btn.textContent = res?.filled
            ? bits.length
              ? `Filled · ${bits.join(" · ")}`
              : "Filled"
            : res?.error || "Retry";
        },
      );
    };

    const close = document.createElement("button");
    close.textContent = "Dismiss";
    close.style.cssText =
      "border:0;border-radius:8px;background:transparent;color:#a7f3d0;font:600 12px system-ui;padding:8px;cursor:pointer";
    close.onclick = () => {
      chrome.runtime.sendMessage({ type: "TAILORSEND_CLEAR_PENDING" });
      bar.remove();
    };

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:6px;align-items:center";
    actions.append(btn, close);
    bar.append(actions);
    document.documentElement.appendChild(bar);
  }

  maybeShowBanner().catch(() => {});
})();
