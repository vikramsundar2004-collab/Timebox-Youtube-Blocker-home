const path = require("path");

function cleanUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function readConfig(overrides = {}) {
  const rootDir = path.resolve(__dirname, "..");
  const port = Number(overrides.port || process.env.PORT || 4242);
  const appUrl = cleanUrl(overrides.appUrl || process.env.APP_URL || `http://localhost:${port}`);
  const dataDir = overrides.dataDir || process.env.DATA_DIR || path.join(rootDir, "data");

  return {
    rootDir,
    port,
    appUrl,
    dataDir,
    licenseStorePath: overrides.licenseStorePath || path.join(dataDir, "licenses.json"),
    downloadsDir: overrides.downloadsDir || path.join(rootDir, "protected-downloads"),
    publicDir: overrides.publicDir || path.join(rootDir, "public"),
    stripeSecretKey: overrides.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: overrides.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "",
    stripePriceId: overrides.stripePriceId || process.env.STRIPE_PRICE_ID || "",
    priceCents: Number(overrides.priceCents || process.env.APP_PRICE_CENTS || 500),
    currency: overrides.currency || process.env.APP_CURRENCY || "usd",
    productName: overrides.productName || "Timebox YouTube Blocker",
    smtp: {
      host: overrides.smtp?.host || process.env.SMTP_HOST || "",
      port: Number(overrides.smtp?.port || process.env.SMTP_PORT || 587),
      secure: String(overrides.smtp?.secure || process.env.SMTP_SECURE || "false") === "true",
      user: overrides.smtp?.user || process.env.SMTP_USER || "",
      pass: overrides.smtp?.pass || process.env.SMTP_PASS || "",
      from: overrides.smtp?.from || process.env.MAIL_FROM || "Timebox YouTube Blocker <support@example.com>"
    }
  };
}

module.exports = { readConfig };
