# Timebox YouTube Blocker Home

Paid download site for Timebox YouTube Blocker. It uses Stripe Checkout for a one-time $5 purchase, creates a license key after payment, gates Windows/Mac downloads behind that key, and lets customers recover their key by email.

## What Is Included

- Stripe Checkout endpoint: `POST /api/checkout`
- Stripe fulfillment webhook: `POST /api/stripe/webhook`
- Success page that displays the paid customer license key
- License verification and protected downloads
- Email recovery for customers on the paid list
- Windows `.cmd` installer and Mac `.command` installer generated from the extension zip
- Privacy, support, terms, setup, and access pages
- Render blueprint with persistent storage for `data/licenses.json`

## Local Setup

```bash
npm install
npm run prepare:downloads
npm run dev
```

Open `http://localhost:4242`.

The download preparation script expects the real extension zip at:

```text
C:\Users\vikra\OneDrive\Documents\New project 4\dist\timebox-youtube-blocker.zip
```

If the zip lives somewhere else, run:

```bash
$env:EXTENSION_ZIP_PATH="C:\path\to\timebox-youtube-blocker.zip"
npm run prepare:downloads
```

## Stripe Setup

Use Stripe Checkout for the payment page. Add these environment variables on Render:

```text
APP_URL=https://your-render-service.onrender.com
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_from_stripe
APP_PRICE_CENTS=500
```

In Stripe Dashboard:

1. Go to Developers, then Webhooks.
2. Add endpoint: `https://your-render-service.onrender.com/api/stripe/webhook`.
3. Select the event: `checkout.session.completed`.
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Use test mode first, then switch to live keys when the flow works.

The app can use `STRIPE_PRICE_ID` if you create a Stripe Price, but it is optional. Without it, the app creates a $5 inline Checkout line item.

## Render Setup

This repo includes `render.yaml`. In Render, create a new Blueprint from this GitHub repo.

Important: the license list must persist. The blueprint attaches a persistent disk at:

```text
/opt/render/project/src/storage
```

Render services have ephemeral filesystems by default, so do not remove the disk unless you replace it with a database.

## Email Recovery

For production, set SMTP credentials:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_user
SMTP_PASS=your_password
MAIL_FROM="Timebox YouTube Blocker <you@example.com>"
```

Without SMTP, recovery works in development by logging the email contents to the server console. That is useful for testing, but real customers need SMTP.

## Desktop and Mobile

Customers can pay on mobile and save their license key. The Chrome extension itself installs on desktop Chrome for Windows, macOS, Chromebook, or another compatible desktop Chromium browser. Chrome on iPhone does not install Chrome extensions, so the site tells mobile customers to use their key later on desktop.

## Tests

```bash
npm run check
npm test
```

The tests cover checkout session creation, paid session fulfillment, license verification, protected downloads, and email recovery.
