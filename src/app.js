const fs = require("fs");
const path = require("path");
const express = require("express");
const Stripe = require("stripe");
const { readConfig } = require("./config");
const { generateLicenseKey, isValidEmail, normalizeEmail, normalizeLicenseKey } = require("./license");
const { LicenseStore } = require("./license-store");
const { createMailer } = require("./mailer");

const DOWNLOADS = {
  windows: {
    file: "timebox-youtube-blocker-windows.cmd",
    label: "Timebox YouTube Blocker Windows installer.cmd",
    contentType: "application/octet-stream"
  },
  mac: {
    file: "timebox-youtube-blocker-mac.command",
    label: "Timebox YouTube Blocker Mac installer.command",
    contentType: "application/octet-stream"
  },
  extension: {
    file: "timebox-youtube-blocker-extension.zip",
    label: "timebox-youtube-blocker-extension.zip",
    contentType: "application/zip"
  }
};

function createStripeClient(config) {
  if (!config.stripeSecretKey) return null;
  return new Stripe(config.stripeSecretKey, {
    apiVersion: "2026-02-25.clover"
  });
}

function getLineItem(config) {
  if (config.stripePriceId) {
    return {
      price: config.stripePriceId,
      quantity: 1
    };
  }

  return {
    price_data: {
      currency: config.currency,
      unit_amount: config.priceCents,
      product_data: {
        name: config.productName,
        description: "A Chrome extension that blocks YouTube by default and allows three 20-minute breaks per day."
      }
    },
    quantity: 1
  };
}

function safeDownloadUrl(platform, licenseKey) {
  return `/download/${platform}?key=${encodeURIComponent(normalizeLicenseKey(licenseKey))}`;
}

function createApp(options = {}) {
  const config = options.config || readConfig();
  const store = options.store || new LicenseStore(config.licenseStorePath);
  const mailer = options.mailer || createMailer(config);
  const stripe = options.stripe === undefined ? createStripeClient(config) : options.stripe;
  const app = express();

  app.disable("x-powered-by");

  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured." });
    }

    let event;
    try {
      if (config.stripeWebhookSecret) {
        const signature = req.headers["stripe-signature"];
        event = stripe.webhooks.constructEvent(req.body, signature, config.stripeWebhookSecret);
      } else {
        event = JSON.parse(req.body.toString("utf8"));
      }
    } catch (error) {
      return res.status(400).send(`Webhook error: ${error.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        if (session.payment_status === "paid" || session.status === "complete") {
          store.activateFromCheckoutSession(session);
        }
      }
      return res.json({ received: true });
    } catch (error) {
      console.error("Webhook fulfillment failed", error);
      return res.status(500).json({ error: "Could not fulfill checkout." });
    }
  });

  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(config.publicDir, { extensions: ["html"] }));

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      stripeConfigured: Boolean(stripe),
      downloads: Object.fromEntries(
        Object.entries(DOWNLOADS).map(([key, value]) => [
          key,
          fs.existsSync(path.join(config.downloadsDir, value.file))
        ])
      )
    });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      priceCents: config.priceCents,
      currency: config.currency,
      productName: config.productName,
      stripeConfigured: Boolean(stripe)
    });
  });

  app.post("/api/checkout", async (req, res) => {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (!stripe) {
      return res.status(503).json({
        error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY in Render before taking live payments."
      });
    }

    const licenseKey = generateLicenseKey();

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [getLineItem(config)],
        success_url: `${config.appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.appUrl}/?checkout=cancelled`,
        metadata: {
          app: "timebox-youtube-blocker",
          license_key: licenseKey
        },
        allow_promotion_codes: false
      });

      store.addPendingSession({ sessionId: session.id, email, licenseKey });
      return res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout creation failed", error);
      return res.status(500).json({ error: "Could not start checkout. Check the Stripe keys and try again." });
    }
  });

  app.get("/api/session-status", async (req, res) => {
    const sessionId = String(req.query.session_id || "");
    if (!sessionId) {
      return res.status(400).json({ error: "Missing checkout session ID." });
    }

    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured." });
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid" && session.status !== "complete") {
        return res.json({ paid: false, status: session.status, paymentStatus: session.payment_status });
      }

      const license = store.activateFromCheckoutSession(session);
      return res.json({
        paid: true,
        email: license.email,
        licenseKey: license.licenseKey,
        downloads: {
          windows: safeDownloadUrl("windows", license.licenseKey),
          mac: safeDownloadUrl("mac", license.licenseKey),
          extension: safeDownloadUrl("extension", license.licenseKey)
        }
      });
    } catch (error) {
      console.error("Session lookup failed", error);
      return res.status(500).json({ error: "Could not confirm payment." });
    }
  });

  app.post("/api/verify-license", (req, res) => {
    const license = store.verify({
      email: req.body.email,
      licenseKey: req.body.licenseKey
    });

    if (!license) {
      return res.status(404).json({ valid: false, error: "That email and key were not found." });
    }

    return res.json({
      valid: true,
      email: license.email,
      licenseKey: license.licenseKey,
      downloads: {
        windows: safeDownloadUrl("windows", license.licenseKey),
        mac: safeDownloadUrl("mac", license.licenseKey),
        extension: safeDownloadUrl("extension", license.licenseKey)
      }
    });
  });

  app.post("/api/recover-key", async (req, res) => {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ found: false, error: "Enter a valid email address." });
    }

    const license = store.findByEmail(email);
    if (!license) {
      return res.status(404).json({ found: false, error: "That email is not on the paid customer list." });
    }

    try {
      await mailer.sendLicenseEmail({ email, licenseKey: license.licenseKey });
      return res.json({ found: true, message: "License key sent." });
    } catch (error) {
      console.error("License recovery email failed", error);
      return res.status(500).json({ found: true, error: "The email exists, but sending failed. Check SMTP settings." });
    }
  });

  app.get("/download/:platform", (req, res) => {
    const platform = String(req.params.platform || "").toLowerCase();
    const download = DOWNLOADS[platform];
    if (!download) {
      return res.status(404).send("Download not found.");
    }

    const key = req.query.key || req.headers["x-license-key"];
    const license = store.findByKey(key);
    if (!license) {
      return res.status(401).send("A valid license key is required for this download.");
    }

    const filePath = path.join(config.downloadsDir, download.file);
    if (!fs.existsSync(filePath)) {
      return res.status(503).send("Download package is not ready yet.");
    }

    res.setHeader("Content-Type", download.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${download.label}"`);
    return res.sendFile(filePath);
  });

  app.use((req, res) => {
    res.status(404).sendFile(path.join(config.publicDir, "404.html"));
  });

  return app;
}

module.exports = { createApp, DOWNLOADS };
