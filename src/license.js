const crypto = require("crypto");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function generateLicenseKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  const bytes = crypto.randomBytes(20);

  for (const byte of bytes) {
    raw += alphabet[byte % alphabet.length];
  }

  return `TBX-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function normalizeLicenseKey(key) {
  const compact = String(key || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (!compact) return "";
  const withoutPrefix = compact.startsWith("TBX") ? compact.slice(3) : compact;
  const groups = withoutPrefix.match(/.{1,4}/g) || [];
  return `TBX-${groups.slice(0, 4).join("-")}`;
}

module.exports = {
  generateLicenseKey,
  isValidEmail,
  normalizeEmail,
  normalizeLicenseKey
};
