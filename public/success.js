const panel = document.querySelector("#success-panel");
const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session_id");

function renderError(message) {
  panel.innerHTML = `
    <p class="message error">${message}</p>
    <p><a class="button secondary" href="/access">Use an existing key</a></p>
  `;
}

function renderDownloads(data) {
  panel.innerHTML = `
    <h2>License key</h2>
    <p class="code">${data.licenseKey}</p>
    <p class="small">Email: ${data.email}</p>
    <div class="download-grid">
      <div class="download-card">
        <h3>Windows PC</h3>
        <p>Downloads a script that prepares the extension folder and opens Chrome’s extensions page.</p>
        <a class="button accent" href="${data.downloads.windows}">Download for Windows</a>
      </div>
      <div class="download-card">
        <h3>Mac</h3>
        <p>Downloads a command file that prepares the extension folder and opens the Chrome setup page.</p>
        <a class="button accent" href="${data.downloads.mac}">Download for Mac</a>
      </div>
      <div class="download-card">
        <h3>Raw zip</h3>
        <p>For Chromebook, Linux, or manual install. Use the setup page if you need steps.</p>
        <a class="button secondary" href="${data.downloads.extension}">Download zip</a>
      </div>
    </div>
    <p><a href="/setup">Open setup steps and video</a></p>
  `;
}

async function loadStatus() {
  if (!sessionId) {
    renderError("No checkout session was found in the URL.");
    return;
  }

  try {
    const response = await fetch(`/api/session-status?session_id=${encodeURIComponent(sessionId)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not confirm payment.");
    }

    if (!data.paid) {
      renderError("Stripe has not marked this checkout as paid yet. Refresh this page in a few seconds.");
      return;
    }

    renderDownloads(data);
  } catch (error) {
    renderError(error.message);
  }
}

loadStatus();
