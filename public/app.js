const checkoutForm = document.querySelector("#checkout-form");
const checkoutMessage = document.querySelector("#checkout-message");

function showMessage(text, kind = "error") {
  checkoutMessage.textContent = text;
  checkoutMessage.className = `message ${kind}`;
}

checkoutForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = checkoutForm.querySelector("button[type='submit']");
  const email = new FormData(checkoutForm).get("email");

  submitButton.disabled = true;
  showMessage("Opening Stripe checkout...", "success");

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Checkout failed.");
    }

    window.location.href = data.url;
  } catch (error) {
    showMessage(error.message);
    submitButton.disabled = false;
  }
});
