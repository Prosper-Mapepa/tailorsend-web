/**
 * Client bridge to the TailorSend Fill Chrome extension.
 * Uses window.postMessage ↔ content script (no hard-coded extension ID).
 */

export const EXTENSION_PAGE_SOURCE = "tailorsend-page";
export const EXTENSION_REPLY_SOURCE = "tailorsend-extension";

export type ExtensionFormField = {
  label: string;
  fieldType: string;
  answer: string;
};

export type ExtensionPdfAttachment = {
  filename: string;
  base64: string;
  mimeType: string;
};

export type ExtensionFillPayload = {
  applicationId?: string;
  applyUrl: string;
  fields: ExtensionFormField[];
  resumePdf?: ExtensionPdfAttachment;
  coverPdf?: ExtensionPdfAttachment;
};

export type ExtensionFillResult = {
  ok: boolean;
  opened?: boolean;
  filled?: boolean;
  filledCount?: number;
  skippedCount?: number;
  uploadedResume?: boolean;
  uploadedCover?: boolean;
  error?: string;
};

function requestId() {
  return `ts_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function onceMessage<T>(
  type: string,
  id: string,
  timeoutMs = 20000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("TailorSend Fill extension did not respond. Is it installed and enabled?"));
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== EXTENSION_REPLY_SOURCE) return;
      if (data.type !== type || data.requestId !== id) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(data.payload as T);
    }

    window.addEventListener("message", onMessage);
  });
}

/** True when the content-script bridge is present on this page. */
export async function pingTailorSendExtension(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const id = requestId();
  const wait = onceMessage<{ ok?: boolean }>("PONG", id, 1500).catch(() => null);
  window.postMessage({ source: EXTENSION_PAGE_SOURCE, type: "PING", requestId: id }, "*");
  const res = await wait;
  return Boolean(res?.ok);
}

/**
 * Ask the extension to open the apply URL and fill matching fields.
 * Must be called from a user gesture when possible.
 */
export async function requestExtensionFill(
  payload: ExtensionFillPayload,
): Promise<ExtensionFillResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Not in a browser." };
  }
  const id = requestId();
  const wait = onceMessage<ExtensionFillResult>("FILL_RESULT", id, 90000);
  window.postMessage(
    {
      source: EXTENSION_PAGE_SOURCE,
      type: "FILL_REQUEST",
      requestId: id,
      payload,
    },
    "*",
  );
  try {
    return await wait;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
