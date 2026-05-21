const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "public/index.html",
  "public/download.html",
  "public/setup.html",
  "public/privacy.html",
  "public/support.html",
  "public/terms.html",
  "public/downloads/timebox-youtube-blocker-windows.cmd",
  "public/downloads/timebox-youtube-blocker-mac.command",
  "public/downloads/timebox-youtube-blocker-extension.zip",
  "public/assets/setup-walkthrough.webm"
];

const forbiddenText = [
  "STRIPE_SECRET_KEY",
  "Continue to Stripe",
  "/api/checkout",
  "/api/verify-license",
  "license key creation after payment"
];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

for (const file of fs.readdirSync(path.join(root, "public")).filter((name) => name.endsWith(".html") || name.endsWith(".js"))) {
  const text = fs.readFileSync(path.join(root, "public", file), "utf8");
  for (const phrase of forbiddenText) {
    if (text.includes(phrase)) {
      throw new Error(`Old payment flow text found in ${file}: ${phrase}`);
    }
  }
}

console.log("Static download site verification passed.");
