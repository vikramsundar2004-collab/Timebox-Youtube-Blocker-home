const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../src/app");
const { readConfig } = require("../src/config");
const { LicenseStore } = require("../src/license-store");

function makeHarness({ stripe } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "timebox-home-"));
  const downloadsDir = path.join(dir, "downloads");
  fs.mkdirSync(downloadsDir, { recursive: true });
  fs.writeFileSync(path.join(downloadsDir, "timebox-youtube-blocker-windows.cmd"), "windows installer");
  fs.writeFileSync(path.join(downloadsDir, "timebox-youtube-blocker-mac.command"), "mac installer");
  fs.writeFileSync(path.join(downloadsDir, "timebox-youtube-blocker-extension.zip"), "zip file");

  const config = readConfig({
    appUrl: "http://localhost:4242",
    dataDir: dir,
    licenseStorePath: path.join(dir, "licenses.json"),
    downloadsDir,
    publicDir: path.resolve(__dirname, "..", "public")
  });
  const store = new LicenseStore(config.licenseStorePath);
  const sent = [];
  const mailer = {
    sendLicenseEmail: async (message) => {
      sent.push(message);
      return { sent: true };
    }
  };
  const app = createApp({ config, store, stripe, mailer });
  return { app, store, sent };
}

function paidSession(overrides = {}) {
  return {
    id: overrides.id || "cs_paid_123",
    status: "complete",
    payment_status: "paid",
    customer: "cus_123",
    customer_details: { email: overrides.email || "paid@example.com" },
    metadata: { license_key: overrides.licenseKey || "TBX-ABCD-EFGH-JKLM-NPQR" }
  };
}

test("checkout creates a Stripe session and records a pending license", async () => {
  let checkoutPayload;
  const stripe = {
    checkout: {
      sessions: {
        create: async (payload) => {
          checkoutPayload = payload;
          return { id: "cs_test_123", url: "https://checkout.stripe.test/pay" };
        }
      }
    },
    webhooks: {
      constructEvent: () => ({ type: "noop" })
    }
  };
  const { app, store } = makeHarness({ stripe });

  const response = await request(app)
    .post("/api/checkout")
    .send({ email: "Buyer@Example.com" })
    .expect(200);

  assert.equal(response.body.url, "https://checkout.stripe.test/pay");
  assert.equal(checkoutPayload.customer_email, "buyer@example.com");
  assert.equal(checkoutPayload.mode, "payment");
  assert.equal(store.read().pendingSessions.length, 1);
});

test("paid session creates a license and returns protected download links", async () => {
  const stripe = {
    checkout: {
      sessions: {
        retrieve: async () => paidSession()
      }
    },
    webhooks: {
      constructEvent: () => ({ type: "noop" })
    }
  };
  const { app, store } = makeHarness({ stripe });

  const response = await request(app)
    .get("/api/session-status?session_id=cs_paid_123")
    .expect(200);

  assert.equal(response.body.paid, true);
  assert.equal(response.body.email, "paid@example.com");
  assert.equal(response.body.licenseKey, "TBX-ABCD-EFGH-JKLM-NPQR");
  assert.match(response.body.downloads.windows, /\/download\/windows\?key=/);
  assert.equal(store.findByEmail("paid@example.com").licenseKey, "TBX-ABCD-EFGH-JKLM-NPQR");
});

test("license verification gates downloads", async () => {
  const { app, store } = makeHarness();
  const license = store.activateFromCheckoutSession(paidSession());

  await request(app)
    .get("/download/windows")
    .expect(401);

  const downloadResponse = await request(app)
    .get(`/download/windows?key=${encodeURIComponent(license.licenseKey)}`)
    .expect(200);

  assert.equal(downloadResponse.body.toString("utf8"), "windows installer");
});

test("license recovery emails known customers and rejects unknown email", async () => {
  const { app, store, sent } = makeHarness();
  store.activateFromCheckoutSession(paidSession({ email: "known@example.com" }));

  await request(app)
    .post("/api/recover-key")
    .send({ email: "missing@example.com" })
    .expect(404);

  const response = await request(app)
    .post("/api/recover-key")
    .send({ email: "known@example.com" })
    .expect(200);

  assert.equal(response.body.found, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, "known@example.com");
});

test("verify-license returns downloads for a matching email and key", async () => {
  const { app, store } = makeHarness();
  const license = store.activateFromCheckoutSession(paidSession({ email: "owner@example.com" }));

  const response = await request(app)
    .post("/api/verify-license")
    .send({ email: "owner@example.com", licenseKey: license.licenseKey })
    .expect(200);

  assert.equal(response.body.valid, true);
  assert.match(response.body.downloads.mac, /\/download\/mac\?key=/);

  await request(app)
    .post("/api/verify-license")
    .send({ email: "wrong@example.com", licenseKey: license.licenseKey })
    .expect(404);
});
