const statusEl = document.getElementById("status");
const refillBtn = document.getElementById("refill");
const clearBtn = document.getElementById("clear");
const stepsEl = document.getElementById("steps");

async function load() {
  const ping = await chrome.runtime.sendMessage({ type: "TAILORSEND_PING" });
  const pendingRes = await chrome.runtime.sendMessage({
    type: "TAILORSEND_GET_PENDING",
  });
  const pending = pendingRes?.pending;

  if (ping?.ok) {
    if (pending) {
      statusEl.textContent = `Ready · ${pending.fields?.length ?? 0} answers queued`;
      statusEl.className = "ok";
    } else if (ping.signedIn) {
      statusEl.textContent = `Connected v${ping.version} · open an apply page`;
      statusEl.className = "ok";
    } else {
      statusEl.textContent = `Installed v${ping.version} · sign in at tailorsend.cc`;
      statusEl.className = "bad";
    }
  } else {
    statusEl.textContent = "Extension not responding";
    statusEl.className = "bad";
  }

  if (stepsEl) {
    stepsEl.innerHTML = ping?.signedIn
      ? `<li>Open a company apply form — the TailorSend panel appears automatically</li>
         <li>Click <strong>Fill this form</strong> on the panel</li>
         <li>Review everything and submit on the company site</li>`
      : `<li>Install this extension, then sign in at <strong>tailorsend.cc</strong></li>
         <li>Open an apply page — the panel appears in the corner</li>
         <li>Click <strong>Fill this form</strong>, review, then submit</li>`;
  }

  refillBtn.disabled = false;
  clearBtn.disabled = !pending;
}

refillBtn.addEventListener("click", async () => {
  refillBtn.disabled = true;
  refillBtn.textContent = "Filling…";
  const res = await chrome.runtime.sendMessage({
    type: "TAILORSEND_FILL_ACTIVE_TAB",
    payload: {},
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
