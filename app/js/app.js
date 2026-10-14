/* TLZ Professional Fee widget
   - Receives the Deal ID from the Client Script
   - Captures the exclusion reason
   - Returns { action: "submit", reason } directly to the Client Script
*/

const SELECTORS = {
  popup: "popup",
  popupTitle: "popupTitle",
  popupMessage: "popupMessage",
  loaderText: "loader-text"
};

const MAX_LENGTH = 1990;

let currentRecordId = null; // Deal ID (from Deal_Name)
let _toastTimeout = null;
let _isSubmitting = false; // prevents double-clicks

/* ---------- Loader ---------- */
function _ensureLoaderCard() {
  const overlay = document.getElementById("loader-overlay");
  if (!overlay) return null;

  let card = overlay.querySelector(".loader-card");
  if (card) return card;

  card = document.createElement("div");
  card.className = "loader-card";
  card.setAttribute("role", "status");
  card.setAttribute("aria-live", "polite");
  card.innerHTML = `
    <div class="spinner-wrap">
      <div class="spinner-track" aria-hidden="true"></div>
      <div class="spinner-arc animate-spin" aria-hidden="true"></div>
    </div>
    <div class="loader-text-wrap">
      <p id="loader-text" class="loader-text"></p>
    </div>
  `;

  overlay.appendChild(card);
  return card;
}

function showLoader(text = "Saving reason...") {
  const overlay = document.getElementById("loader-overlay");
  if (!overlay) return;

  overlay.classList.remove("hidden");
  const card = _ensureLoaderCard();
  if (!card) return;

  card.classList.remove("success");

  const spinnerArc = card.querySelector(".spinner-arc");
  if (spinnerArc) spinnerArc.classList.add("animate-spin");

  const loaderText = document.getElementById("loader-text");
  if (loaderText) loaderText.textContent = text;

  overlay.setAttribute("aria-hidden", "false");
}

function showLoaderSuccess(text = "Saved") {
  const overlay = document.getElementById("loader-overlay");
  if (!overlay) return;
  const card = _ensureLoaderCard();
  if (!card) return;

  const spinnerWrap = card.querySelector(".spinner-wrap");
  if (spinnerWrap) {
    spinnerWrap.innerHTML = `
      <div class="loader-success-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="height:20px;width:20px">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
    `;
  }

  card.classList.add("success");

  const loaderText = document.getElementById("loader-text");
  if (loaderText) loaderText.textContent = text;

  overlay.setAttribute("aria-hidden", "false");
}

function hideLoader() {
  const overlay = document.getElementById("loader-overlay");
  if (!overlay) return;

  const card = overlay.querySelector(".loader-card");
  if (card) {
    const spinnerWrap = card.querySelector(".spinner-wrap");
    if (spinnerWrap && !spinnerWrap.querySelector(".spinner-arc")) {
      spinnerWrap.innerHTML = `
        <div class="spinner-track" aria-hidden="true"></div>
        <div class="spinner-arc animate-spin" aria-hidden="true"></div>
      `;
    }
    card.classList.remove("success");
  }

  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
}

/* ---------- Page load: get Deal ID from the Client Script ---------- */
ZOHO.embeddedApp.on("PageLoad", async (entity) => {
  console.log("PageLoad entity:", entity);
  currentRecordId =
    entity?.value?.prospectId ??
    entity?.prospectId ??
    entity?.data?.prospectId ??
    null;
  console.log("currentRecordId (Deal):", currentRecordId);
});
ZOHO.embeddedApp.init();
console.log("widget script loaded");

/* ---------- Close widget ---------- */
function closeWidget(payload) {
  console.log("closeWidget called with:", payload, "| $Client type:", typeof $Client);

  try {
    if (typeof $Client !== "undefined" && typeof $Client.close === "function") {
      $Client.close(payload || { action: "cancel" });
      return;
    }
  } catch (e) {
    console.warn("$Client.close failed", e);
  }

  try {
    if (window.ZDK && ZDK.Client && typeof ZDK.Client.closePopup === "function") {
      ZDK.Client.closePopup();
      return;
    }
  } catch (e) {
    console.warn("ZDK.Client.closePopup failed", e);
  }

  console.warn("No close method available. typeof $Client =", typeof $Client);
}

function editQuote() {
  if (_isSubmitting) return;
  hideLoader();
  closeWidget({ action: "cancel" });
}

/* ---------- Validation ---------- */
function setNotesError(message) {
  const notesInput = document.getElementById("notesInput");
  const errorMsg = document.getElementById("error-msg");
  if (errorMsg) {
    const textSpan = errorMsg.querySelector(".error-text") || (() => {
      const s = document.createElement("span");
      s.className = "error-text";
      errorMsg.appendChild(s);
      return s;
    })();

    textSpan.textContent = " " + message;
    errorMsg.classList.remove("hidden");
  }
  if (notesInput) {
    notesInput.classList.add("input-error");
    notesInput.focus();
  }
}

function clearNotesError() {
  const notesInput = document.getElementById("notesInput");
  const errorMsg = document.getElementById("error-msg");
  if (!notesInput) return;
  const v = notesInput.value.trim();
  if (v && v.length <= MAX_LENGTH) {
    if (errorMsg) errorMsg.classList.add("hidden");
    notesInput.classList.remove("input-error");
  }
}

/* ---------- Submit ---------- */
async function submitQuote() {
  if (_isSubmitting) return;

  const notesInput = document.getElementById("notesInput");
  if (!notesInput) {
    showPopup("Error", "Notes input not found.");
    return;
  }

  const notesValue = notesInput.value.trim();

  if (!notesValue) {
    setNotesError("Please provide a reason for excluding the TLZ Professional Fee before submitting.");
    return;
  }
  if (notesValue.length > MAX_LENGTH) {
    setNotesError(`Reason cannot exceed ${MAX_LENGTH} characters. Current length: ${notesValue.length}`);
    return;
  }

  _isSubmitting = true;
  showLoader("Saving reason...");

  try {
    showLoaderSuccess("Saved");
    showToast("Saved", "Reason recorded successfully.", "success");

    // Pass the reason back to the Client Script to populate the quote field
    setTimeout(() => {
      hideLoader();
      closeWidget({ action: "submit", reason: notesValue });
    }, 1100);

  } catch (err) {
    _isSubmitting = false;
    hideLoader();
    console.error("Submit error:", err);
    showPopup("Submission failed", "Could not process: " + (err?.message || JSON.stringify(err)));
  }
}

/* ---------- Toast & Popup ---------- */
function showToast(titleText, message, type = "success") {
  const toast = document.getElementById("toast");
  const title = document.getElementById("toastTitle");
  const msg = document.getElementById("toastMessage");
  const icon = document.getElementById("toastIcon");
  if (!toast) return;

  if (title) title.textContent = titleText || "";
  if (msg) msg.textContent = message || "";

  if (icon) {
    icon.className = "toast-icon";
    if (type === "success") {
      icon.classList.add("success");
      icon.innerHTML = '<svg style="height:22px;width:22px;color:inherit" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>';
    } else {
      icon.innerHTML = "";
    }
  }

  if (_toastTimeout) clearTimeout(_toastTimeout);

  toast.style.display = "flex";
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  _toastTimeout = setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => {
      toast.style.display = "none";
    }, 300);
  }, 3000);
}

function showPopup(titleText, message) {
  const popup = document.getElementById(SELECTORS.popup);
  const title = document.getElementById(SELECTORS.popupTitle);
  const msg = document.getElementById(SELECTORS.popupMessage);
  if (!popup) { alert((titleText ? titleText + ": " : "") + (message || "")); return; }
  if (title) title.textContent = titleText || "Notification";
  if (msg) msg.textContent = message || "";
  popup.classList.remove("hidden");
}

window.editQuote = editQuote;
window.submitQuote = submitQuote;
window.clearNotesError = clearNotesError;