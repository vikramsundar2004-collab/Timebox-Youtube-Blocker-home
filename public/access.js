const verifyForm = document.querySelector("#verify-form");
const recoverForm = document.querySelector("#recover-form");
const verifyResult = document.querySelector("#verify-result");
const recoverResult = document.querySelector("#recover-result");

function message(text, kind = "error") {
  return `<p class="message ${kind}">${text}</p>`;
}

function downloadMarkup(downloads) {
  return `
    ${message("License found. Downloads are unlocked.", "success")}
    <div class="download-grid">
      <div class="download-card">
        <h3>Windows PC</h3>
        <p>Best for Windows Chrome.</p>
        <a class="button accent" href="${downloads.windows}">Download Windows</a>
      </div>
      <div class="download-card">
        <h3>Mac</h3>
        <p>Best for Chrome on macOS.</p>
        <a class="button accent" href="${downloads.mac}">Download Mac</a>
      </div>
      <div class="download-card">
        <h3>Raw zip</h3>
        <p>Manual install package.</p>
        <a class="button secondary" href="${downloads.extension}">Download zip</a>
      </div>
    </div>
  `;
}

verifyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  verifyResult.innerHTML = message("Checking license...", "success");

  try {
    const formData = new FormData(verifyForm);
    const response = await fetch("/api/verify-license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        licenseKey: formData.get("licenseKey")
      })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "License was not found.");
    }

    verifyResult.innerHTML = downloadMarkup(data.downloads);
  } catch (error) {
    verifyResult.innerHTML = message(error.message);
  }
});

recoverForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  recoverResult.innerHTML = message("Checking customer list...", "success");

  try {
    const email = new FormData(recoverForm).get("email");
    const response = await fetch("/api/recover-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "That email is not on the paid customer list.");
    }

    recoverResult.innerHTML = message("That email is on the list. A recovery email was sent.", "success");
  } catch (error) {
    recoverResult.innerHTML = message(error.message);
  }
});
