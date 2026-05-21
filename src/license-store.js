const fs = require("fs");
const path = require("path");
const { generateLicenseKey, normalizeEmail, normalizeLicenseKey } = require("./license");

class LicenseStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  ensureReady() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this.write({
        licenses: [],
        pendingSessions: [],
        updatedAt: new Date().toISOString()
      });
    }
  }

  read() {
    this.ensureReady();
    return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
  }

  write(data) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const next = {
      licenses: data.licenses || [],
      pendingSessions: data.pendingSessions || [],
      updatedAt: new Date().toISOString()
    };
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2));
    fs.renameSync(tmpPath, this.filePath);
  }

  listLicenses() {
    return this.read().licenses;
  }

  addPendingSession({ sessionId, email, licenseKey }) {
    const data = this.read();
    const normalizedEmail = normalizeEmail(email);
    const normalizedKey = normalizeLicenseKey(licenseKey || generateLicenseKey());
    const existing = data.pendingSessions.find((entry) => entry.sessionId === sessionId);

    if (existing) {
      return existing;
    }

    const pending = {
      sessionId,
      email: normalizedEmail,
      licenseKey: normalizedKey,
      createdAt: new Date().toISOString()
    };

    data.pendingSessions.push(pending);
    this.write(data);
    return pending;
  }

  findByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    return this.read().licenses.find((license) => license.email === normalizedEmail && license.status === "active") || null;
  }

  findByKey(key) {
    const normalizedKey = normalizeLicenseKey(key);
    return this.read().licenses.find((license) => license.licenseKey === normalizedKey && license.status === "active") || null;
  }

  verify({ email, licenseKey }) {
    const normalizedEmail = normalizeEmail(email);
    const license = this.findByKey(licenseKey);

    if (!license) return null;
    if (normalizedEmail && license.email !== normalizedEmail) return null;
    return license;
  }

  activateFromCheckoutSession(session) {
    const data = this.read();
    const sessionId = session.id;
    const pending = data.pendingSessions.find((entry) => entry.sessionId === sessionId);
    const sessionEmail = normalizeEmail(
      session.customer_details?.email ||
        session.customer_email ||
        pending?.email ||
        session.metadata?.email
    );
    const licenseKey = normalizeLicenseKey(
      session.metadata?.license_key ||
        pending?.licenseKey ||
        generateLicenseKey()
    );

    if (!sessionEmail) {
      throw new Error("Paid checkout session is missing a customer email.");
    }

    const existingForSession = data.licenses.find((license) => license.checkoutSessionId === sessionId);
    if (existingForSession) {
      return existingForSession;
    }

    const existingForEmail = data.licenses.find((license) => license.email === sessionEmail && license.status === "active");
    if (existingForEmail) {
      return existingForEmail;
    }

    const license = {
      email: sessionEmail,
      licenseKey,
      status: "active",
      checkoutSessionId: sessionId,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || "",
      createdAt: new Date().toISOString()
    };

    data.licenses.push(license);
    data.pendingSessions = data.pendingSessions.filter((entry) => entry.sessionId !== sessionId);
    this.write(data);
    return license;
  }
}

module.exports = { LicenseStore };
