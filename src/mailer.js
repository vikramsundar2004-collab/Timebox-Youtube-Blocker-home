const nodemailer = require("nodemailer");

function createMailer(config) {
  const smtpReady = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
  const transporter = smtpReady
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass
        }
      })
    : null;

  async function sendLicenseEmail({ email, licenseKey }) {
    const subject = "Your Timebox YouTube Blocker license key";
    const text = [
      "Here is your Timebox YouTube Blocker license key:",
      "",
      licenseKey,
      "",
      "Use it on the download page to get the Windows or Mac installer again.",
      `${config.appUrl}/access`
    ].join("\n");

    if (!transporter) {
      console.log(`[dev-email] To: ${email}\nSubject: ${subject}\n\n${text}`);
      return { sent: true, mode: "console" };
    }

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject,
      text
    });

    return { sent: true, mode: "smtp" };
  }

  return { sendLicenseEmail };
}

module.exports = { createMailer };
