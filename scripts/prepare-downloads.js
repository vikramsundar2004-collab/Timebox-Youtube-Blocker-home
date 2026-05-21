const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const defaultExtensionZip = path.resolve(repoRoot, "..", "New project 4", "dist", "timebox-youtube-blocker.zip");
const outputDir = path.join(repoRoot, "public", "downloads");
const bundledExtensionZip = path.join(outputDir, "timebox-youtube-blocker-extension.zip");
const requestedSourceZip = process.env.EXTENSION_ZIP_PATH || defaultExtensionZip;

function wrapBase64(base64) {
  return base64.match(/.{1,76}/g).join("\n");
}

function resolveSourceZip() {
  if (fs.existsSync(requestedSourceZip)) {
    return requestedSourceZip;
  }

  if (fs.existsSync(bundledExtensionZip)) {
    console.log(`Using bundled extension zip: ${bundledExtensionZip}`);
    return bundledExtensionZip;
  }

  throw new Error(
    [
      "Extension zip not found.",
      `Checked: ${requestedSourceZip}`,
      `Checked bundled fallback: ${bundledExtensionZip}`,
      "Run this locally once with EXTENSION_ZIP_PATH pointed at the extension zip, then commit public/downloads/timebox-youtube-blocker-extension.zip."
    ].join("\n")
  );
}

function writeWindowsInstaller(base64) {
  const script = `@echo off
setlocal
set "DEST=%USERPROFILE%\\TimeboxYouTubeBlockerExtension"
set "ZIP=%TEMP%\\timebox-youtube-blocker-extension.zip"
echo Preparing Timebox YouTube Blocker...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$b=@'
${base64}
'@; [IO.File]::WriteAllBytes($env:ZIP, [Convert]::FromBase64String(($b -replace '\\s',''))); if (Test-Path -LiteralPath $env:DEST) { Get-ChildItem -LiteralPath $env:DEST -Force | Remove-Item -Recurse -Force }; New-Item -ItemType Directory -Force -Path $env:DEST | Out-Null; Expand-Archive -LiteralPath $env:ZIP -DestinationPath $env:DEST -Force"
if errorlevel 1 (
  echo Something went wrong while preparing the extension folder.
  pause
  exit /b 1
)
echo.
echo The extension folder is ready:
echo %DEST%
echo.
echo Chrome will open now. Turn on Developer mode, click Load unpacked, and choose the folder above.
start "" "%DEST%"
start "" chrome "chrome://extensions"
echo.
pause
`;

  fs.writeFileSync(path.join(outputDir, "timebox-youtube-blocker-windows.cmd"), script);
}

function writeMacInstaller(base64) {
  const script = `#!/bin/bash
set -e
DEST="$HOME/TimeboxYouTubeBlockerExtension"
ZIP="$TMPDIR/timebox-youtube-blocker-extension.zip"
if [ -z "$TMPDIR" ]; then
  ZIP="/tmp/timebox-youtube-blocker-extension.zip"
fi

echo "Preparing Timebox YouTube Blocker..."
base64 --decode > "$ZIP" <<'TIMEBOX_EXTENSION_ZIP'
${base64}
TIMEBOX_EXTENSION_ZIP

rm -rf "$DEST"
mkdir -p "$DEST"
unzip -q "$ZIP" -d "$DEST"

echo
echo "The extension folder is ready:"
echo "$DEST"
echo
echo "Chrome will open now. Turn on Developer mode, click Load unpacked, and choose that folder."
open "$DEST" || true
open -a "Google Chrome" "chrome://extensions" || open "https://support.google.com/chrome_webstore/answer/2664769" || true
echo
read -r -p "Press Return when you are done."
`;

  fs.writeFileSync(path.join(outputDir, "timebox-youtube-blocker-mac.command"), script);
}

function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  const sourceZip = resolveSourceZip();

  const zipBuffer = fs.readFileSync(sourceZip);
  const base64 = wrapBase64(zipBuffer.toString("base64"));

  if (path.resolve(sourceZip) !== path.resolve(bundledExtensionZip)) {
    fs.copyFileSync(sourceZip, bundledExtensionZip);
  }
  writeWindowsInstaller(base64);
  writeMacInstaller(base64);
  fs.writeFileSync(
    path.join(outputDir, "README.txt"),
    [
      "Timebox YouTube Blocker downloads",
      "",
      "Windows: open timebox-youtube-blocker-windows.cmd",
      "Mac: open timebox-youtube-blocker-mac.command",
      "Manual install: use timebox-youtube-blocker-extension.zip",
      "",
      "Chrome setup:",
      "1. Open chrome://extensions",
      "2. Turn on Developer mode",
      "3. Click Load unpacked",
      "4. Choose the TimeboxYouTubeBlockerExtension folder"
    ].join("\n")
  );

  console.log(`Prepared downloads in ${outputDir}`);
}

run();
