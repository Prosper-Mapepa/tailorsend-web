/**
 * Bridge: TailorSend page ↔ extension background.
 * Syncs auth token so the overlay can fetch applications on ATS pages.
 */
(function () {
  const SOURCE = "tailorsend-page";
  const REPLY = "tailorsend-extension";

  function reply(type, requestId, payload) {
    window.postMessage({ source: REPLY, type, requestId, payload }, "*");
  }

  function syncAuthFromPage() {
    try {
      const token = localStorage.getItem("tailorsend_token") || "";
      const apiBase = location.origin;
      chrome.runtime.sendMessage(
        {
          type: "TAILORSEND_AUTH_SYNC",
          payload: { token: token || null, apiBase },
        },
        () => void chrome.runtime.lastError,
      );
    } catch {
      /* ignore */
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== SOURCE) return;

    if (data.type === "PING") {
      chrome.runtime.sendMessage({ type: "TAILORSEND_PING" }, (res) => {
        reply(
          "PONG",
          data.requestId,
          res || { ok: false, error: chrome.runtime.lastError?.message },
        );
      });
      return;
    }

    if (data.type === "AUTH_SYNC") {
      chrome.runtime.sendMessage(
        { type: "TAILORSEND_AUTH_SYNC", payload: data.payload },
        (res) => {
          reply(
            "AUTH_SYNCED",
            data.requestId,
            res || { ok: false, error: chrome.runtime.lastError?.message },
          );
        },
      );
      return;
    }

    if (data.type === "FILL_REQUEST") {
      chrome.runtime.sendMessage(
        { type: "TAILORSEND_FILL_REQUEST", payload: data.payload },
        (res) => {
          reply(
            "FILL_RESULT",
            data.requestId,
            res || {
              ok: false,
              error:
                chrome.runtime.lastError?.message ||
                "Extension did not respond.",
            },
          );
        },
      );
    }
  });

  syncAuthFromPage();
  window.addEventListener("storage", (e) => {
    if (e.key === "tailorsend_token") syncAuthFromPage();
  });
  setInterval(syncAuthFromPage, 15000);

  window.postMessage({ source: REPLY, type: "READY" }, "*");
})();
