# Timebox YouTube Blocker Home

Direct download website for Timebox YouTube Blocker.

This version is built for an in-person launch: people pay by cash, then open the URL and download the extension installer for their computer. There is no Stripe setup, no server secrets, and no license key system.

## What Is Included

- Clean home page with direct download buttons
- Windows `.cmd` installer
- Mac `.command` installer
- Raw extension zip for manual install
- Setup page with video and written steps
- Privacy, support, and terms pages
- Render static site configuration

## Local Setup

```bash
npm install
npm run prepare:downloads
```

Then open:

```text
public/index.html
```

The download preparation script expects the real extension zip at:

```text
C:\Users\vikra\OneDrive\Documents\New project 4\dist\timebox-youtube-blocker.zip
```

If the zip lives somewhere else, run:

```powershell
$env:EXTENSION_ZIP_PATH="C:\path\to\timebox-youtube-blocker.zip"
npm run prepare:downloads
```

## Render Setup

Use a **Static Site** on Render.

Settings:

```text
Build Command: npm ci && npm run prepare:downloads
Publish Directory: public
```

No environment variables are needed unless the extension zip location changes during build.

The included `render.yaml` is also set up for a Render static site:

```yaml
runtime: static
buildCommand: npm ci && npm run prepare:downloads
staticPublishPath: ./public
```

## Download URLs

After deployment, the public download URLs will be:

```text
/downloads/timebox-youtube-blocker-windows.cmd
/downloads/timebox-youtube-blocker-mac.command
/downloads/timebox-youtube-blocker-extension.zip
```

## Tests

```bash
npm run check
npm test
```

The test script verifies that the static pages and download files exist and that old payment flow text is gone.
