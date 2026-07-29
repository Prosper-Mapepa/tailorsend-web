const statusEl = document.getElementById("status");
const refillBtn = document.getElementById("refill");
const clearBtn = document.getElementById("clear");

async function load() {
  const ping = await chrome.runtime.sendMessage({ type: "TAILORSEND_PING" });
  const pendingRes = await chrome.runtime.sendMessage({
    type: "TAILORSEND_GET_PENDING",
  });
  const pending = pendingRes?.pending;
  if (ping?.ok) {
    statusEl.textContent = pending
      ? `Ready · ${pending.fields?.length ?? 0} answers queued`
      : `Installed v${ping.version} · waiting for TailorSend`;
    statusEl.className = "ok";
  } else {
    statusEl.textContent = "Extension not responding";
    statusEl.className = "bad";
  }
  refillBtn.disabled = !pending;
  clearBtn.disabled = !pending;
}

refillBtn.addEventListener("click", async () => {
  const pendingRes = await chrome.runtime.sendMessage({
    type: "TAILORSEND_GET_PENDING",
  });
  const pending = pendingRes?.pending;
  if (!pending) return;
  refillBtn.disabled = true;
  refillBtn.textContent = "Filling…";
  const res = await chrome.runtime.sendMessage({
    type: "TAILORSEND_FILL_ACTIVE_TAB",
    payload: {
      fields: pending.fields,
      resumePdf: pending.resumePdf || null,
      coverPdf: pending.coverPdf || null,
    },
  });
  const bits = [];
  if (res?.filledCount) bits.push(`${res.filledCount} fields`);
  if (res?.uploadedResume) bits.push("resume");
  if (res?.uploadedCover) bits.push("cover");
  refillBtn.textContent = res?.filled
    ? bits.length
      ? `Filled · ${bits.join(" · ")}`
      : "Filled"
    : res?.error || "Fill failed";
  await load();
});

clearBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "TAILORSEND_CLEAR_PENDING" });
  await load();
});

load();
