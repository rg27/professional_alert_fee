
document.addEventListener("DOMContentLoaded", function () {
  const alertCard = document.getElementById("feeAlert");
  const recheckBtn = document.getElementById("recheckBtn");
  const dismissBtn = document.getElementById("dismissBtn");
  const statusMessage = document.getElementById("statusMessage");

  function showStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = "status-message";

    if (type) {
      statusMessage.classList.add(type);
    }
  }

  // Integration point: connect this to Zoho CRM quote data.
  async function checkQuoteForProfessionalFee() {
    /*
      TODO:
      1. Retrieve the current Quote ID from the Zoho CRM widget context.
      2. Fetch the quote's product line items.
      3. Check whether the TLZ Professional Fee product exists.
      4. Return true if present, false if missing.

      Do not treat a failed API request as a missing product.
    */

    throw new Error("Quote validation has not been connected yet.");
  }

  recheckBtn.addEventListener("click", async function () {
    const originalText = recheckBtn.innerHTML;

    recheckBtn.disabled = true;
    dismissBtn.disabled = true;
    recheckBtn.innerHTML =
      '<span class="refresh-icon" aria-hidden="true">↻</span> Checking...';

    showStatus("Checking the quote...", "");

    try {
      const feeExists = await checkQuoteForProfessionalFee();

      if (feeExists) {
        alertCard.classList.add("is-dismissed");
      } else {
        showStatus(
          "The TLZ Professional Fee is still missing. Please update the quote.",
          "error"
        );
      }
    } catch (error) {
      console.error("Quote validation failed:", error);

      showStatus(
        "Unable to verify the quote. Please try again.",
        "error"
      );
    } finally {
      recheckBtn.disabled = false;
      dismissBtn.disabled = false;
      recheckBtn.innerHTML = originalText;
    }
  });

  dismissBtn.addEventListener("click", function () {
    alertCard.classList.add("is-dismissed");
  });
});
