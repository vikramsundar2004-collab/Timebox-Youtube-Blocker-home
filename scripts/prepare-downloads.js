const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const defaultExtensionZip = path.resolve(repoRoot, "..", "New project 4", "dist", "timebox-youtube-blocker.zip");
const sourceZip = process.env.EXTENSION_ZIP_PATH || defaultExtensionZip;
const outputDir = path.join(repoRoot, "protected-downloads");

function wrapBase64(base64) {
  return base64.match(/.{1,76}/g).join("\n");
}

function ensureSource() {
  if (!fs.existsSync(sourceZip)) {
    throw new Error(`Extension zip not found: ${sourceZip}`);
  }
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
  ensureSource();
  fs.mkdirSync(outputDir, { recursive: true });

  const zipBuffer = fs.readFileSync(sourceZip);
  const base64 = wrapBase64(zipBuffer.toString("base64"));

  fs.copyFileSync(sourceZip, path.join(outputDir, "timebox-youtube-blocker-extension.zip"));
  writeWindowsInstaller(base64);
  writeMacInstaller(base64);

  console.log(`Prepared downloads in ${outputDir}`);
}

run();
