/**
 * Bridge: TailorSend page ↔ extension background.
 * The page posts window messages; we forward to the service worker.
 */
(function () {
  const SOURCE = "tailorsend-page";
  const REPLY = "tailorsend-extension";

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== SOURCE) return;

    if (data.type === "PING") {
      chrome.runtime.sendMessage({ type: "TAILORSEND_PING" }, (res) => {
        window.postMessage(
          {
            source: REPLY,
            type: "PONG",
            requestId: data.requestId,
            payload: res || { ok: false, error: chrome.runtime.lastError?.message },
          },
          "*",
        );
      });
      return;
    }

    if (data.type === "FILL_REQUEST") {
      chrome.runtime.sendMessage(
        { type: "TAILORSEND_FILL_REQUEST", payload: data.payload },
        (res) => {
          window.postMessage(
            {
              source: REPLY,
              type: "FILL_RESULT",
              requestId: data.requestId,
              payload:
                res ||
                {
                  ok: false,
                  error:
                    chrome.runtime.lastError?.message ||
                    "Extension did not respond.",
                },
            },
            "*",
          );
        },
      );
    }
  });

  // Announce that the extension is present.
  window.postMessage({ source: REPLY, type: "READY" }, "*");
})();
