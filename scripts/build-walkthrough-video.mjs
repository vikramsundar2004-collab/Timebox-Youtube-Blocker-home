import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicAssets = path.join(repoRoot, "public", "assets");
const tempDir = path.join(repoRoot, ".video-work");
const defaultRecordingPath =
  "C:\\Users\\vikra\\OneDrive\\Videos\\Screen Recordings\\Screen Recording 2026-05-21 165050.mp4";
const sourceRecordingPath = process.env.TIMEBOX_SETUP_RECORDING || defaultRecordingPath;

const videos = [
  {
    file: "setup-windows.webm",
    title: "Windows Real Install",
    accent: "#c9422b",
    note: "Real Windows recording, trimmed to only the useful setup steps.",
    segments: [
      {
        type: "recording",
        start: 0.2,
        end: 5.8,
        caption: "Download the Windows installer from the Timebox download page."
      },
      {
        type: "recording",
        start: 35.0,
        end: 39.7,
        caption: "Open chrome://extensions, turn on Developer mode, then click Load unpacked."
      },
      {
        type: "recording",
        start: 40.0,
        end: 47.1,
        caption: "Select the timebox-youtube-blocker-extension folder."
      },
      {
        type: "recording",
        start: 52.0,
        end: 56.3,
        caption: "Test YouTube. The blocker should stop the page when no break is active."
      },
      {
        type: "recording",
        start: 64.0,
        end: 66.2,
        caption: "Confirm Timebox YouTube Blocker is installed and enabled."
      }
    ]
  },
  {
    file: "setup-mac.webm",
    title: "Mac Install Guide",
    accent: "#246b6b",
    note: "Mac uses the same Chrome Load unpacked flow after the installer creates the folder.",
    segments: [
      {
        type: "guide",
        duration: 4200,
        caption: "On Mac, click Download Mac installer and open the .command file.",
        guide: {
          eyebrow: "Mac step",
          title: "Download the Mac installer.",
          body: "If macOS blocks it, right-click the .command file and choose Open.",
          detail: "timebox-youtube-blocker-mac.command"
        }
      },
      {
        type: "recording",
        start: 35.0,
        end: 39.7,
        caption: "In Chrome, open chrome://extensions, enable Developer mode, and click Load unpacked."
      },
      {
        type: "recording",
        start: 40.0,
        end: 47.1,
        caption: "Pick the Timebox extension folder. On Mac the folder window will look different."
      },
      {
        type: "recording",
        start: 52.0,
        end: 56.3,
        caption: "Open YouTube to confirm the blocker is working."
      },
      {
        type: "recording",
        start: 64.0,
        end: 66.2,
        caption: "Leave the extension enabled and keep the Timebox folder on the computer."
      }
    ]
  },
  {
    file: "setup-chromebook-linux.webm",
    title: "Manual Zip Guide",
    accent: "#7a4f13",
    note: "Use this path for Chromebook, Linux, or when script downloads are blocked.",
    segments: [
      {
        type: "guide",
        duration: 4200,
        caption: "Download the raw zip, then extract it before loading it in Chrome.",
        guide: {
          eyebrow: "Manual step",
          title: "Download and extract the raw zip.",
          body: "Chrome cannot load the zip directly. Select the extracted folder later.",
          detail: "timebox-youtube-blocker-extension.zip"
        }
      },
      {
        type: "recording",
        start: 35.0,
        end: 39.7,
        caption: "Open chrome://extensions, turn on Developer mode, then click Load unpacked."
      },
      {
        type: "recording",
        start: 40.0,
        end: 47.1,
        caption: "Choose the extracted Timebox extension folder."
      },
      {
        type: "recording",
        start: 52.0,
        end: 56.3,
        caption: "Test YouTube. A working install blocks YouTube immediately."
      },
      {
        type: "guide",
        duration: 3600,
        caption: "Chrome extensions are for computers. iPhone, iPad, and Android Chrome cannot install this directly.",
        guide: {
          eyebrow: "Compatibility",
          title: "Use desktop Chrome.",
          body: "Guest mode and school/work managed devices can also block extension installs.",
          detail: "Use a personal computer if Load unpacked is missing."
        }
      }
    ]
  }
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ].filter(Boolean);

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("Google Chrome was not found. Set CHROME_PATH and run this script again.");
  }
  return found;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function guideMarkup(guide, accent) {
  return `
    <div class="guide-card" style="--accent:${accent}">
      <div class="guide-eyebrow">${escapeHtml(guide.eyebrow)}</div>
      <h1>${escapeHtml(guide.title)}</h1>
      <p>${escapeHtml(guide.body)}</p>
      <div class="guide-detail">${escapeHtml(guide.detail)}</div>
    </div>`;
}

function renderHtml(video) {
  const segments = video.segments.map((segment, index) => ({
    ...segment,
    label: `Step ${index + 1} of ${video.segments.length}`,
    guideHtml: segment.guide ? guideMarkup(segment.guide, video.accent) : ""
  }));

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 1280px;
        height: 720px;
        overflow: hidden;
        background: #0f1115;
        color: #ffffff;
        font-family: "Segoe UI", Arial, sans-serif;
      }
      .stage {
        position: relative;
        width: 1280px;
        height: 720px;
        background: #111418;
      }
      video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: #111418;
      }
      .guide {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 56px;
        background:
          linear-gradient(90deg, rgba(15, 17, 21, 0.76), rgba(15, 17, 21, 0.28)),
          #f7f5ef;
      }
      .guide[hidden],
      video[hidden] {
        display: none;
      }
      .guide-card {
        width: 760px;
        min-height: 410px;
        margin-right: auto;
        border: 2px solid #171717;
        background: #fffefa;
        color: #171717;
        padding: 42px;
        display: grid;
        align-content: center;
        gap: 18px;
        box-shadow: 0 18px 55px rgba(23, 23, 23, 0.18);
      }
      .guide-eyebrow {
        color: var(--accent);
        font-size: 20px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .guide-card h1 {
        margin: 0;
        font-family: Georgia, serif;
        font-size: 62px;
        line-height: 1.02;
      }
      .guide-card p {
        margin: 0;
        max-width: 650px;
        color: #47423c;
        font-size: 28px;
        line-height: 1.22;
      }
      .guide-detail {
        border: 1px solid #d8d1c4;
        background: #f7f5ef;
        color: var(--accent);
        font-family: Consolas, monospace;
        font-size: 25px;
        font-weight: 800;
        padding: 16px;
        overflow-wrap: anywhere;
      }
      .top-pill,
      .caption {
        position: absolute;
        left: 24px;
        z-index: 3;
        border: 1px solid rgba(255, 255, 255, 0.22);
        background: rgba(12, 14, 18, 0.88);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.26);
        backdrop-filter: blur(8px);
      }
      .top-pill {
        top: 20px;
        max-width: 900px;
        border-radius: 999px;
        padding: 10px 16px;
        color: #f4f1ea;
        font-size: 18px;
        font-weight: 800;
      }
      .top-pill strong {
        color: ${video.accent};
        margin-right: 10px;
      }
      .caption {
        bottom: 22px;
        max-width: 900px;
        border-left: 8px solid ${video.accent};
        border-radius: 8px;
        padding: 18px 22px 20px;
      }
      .step-label {
        margin-bottom: 8px;
        color: #d9d3c8;
        font-size: 17px;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .caption-text {
        color: #ffffff;
        font-size: 30px;
        font-weight: 850;
        line-height: 1.14;
      }
    </style>
  </head>
  <body>
    <div class="stage">
      <video id="source" src="${pathToFileURL(sourceRecordingPath).href}" muted preload="auto" playsinline></video>
      <div id="guide" class="guide" hidden></div>
      <div class="top-pill"><strong>${escapeHtml(video.title)}</strong>${escapeHtml(video.note)}</div>
      <div class="caption">
        <div id="stepLabel" class="step-label"></div>
        <div id="captionText" class="caption-text"></div>
      </div>
    </div>
    <script>
      const segments = ${JSON.stringify(segments)};
      const source = document.getElementById("source");
      const guide = document.getElementById("guide");
      const stepLabel = document.getElementById("stepLabel");
      const captionText = document.getElementById("captionText");
      window.demoReady = false;
      window.demoDone = false;

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      function setOverlay(segment) {
        stepLabel.textContent = segment.label;
        captionText.textContent = segment.caption;
      }

      async function waitForVideoReady() {
        if (source.readyState >= 1) return;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Video metadata did not load.")), 20000);
          source.addEventListener("loadedmetadata", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
          source.load();
        });
      }

      async function seek(time) {
        await waitForVideoReady();
        if (Math.abs(source.currentTime - time) < 0.05 && source.readyState >= 2) return;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Seek timed out.")), 12000);
          source.addEventListener("seeked", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
          source.currentTime = time;
        });
      }

      async function showGuide(segment, previewOnly = false) {
        source.pause();
        source.hidden = true;
        guide.hidden = false;
        guide.innerHTML = segment.guideHtml;
        setOverlay(segment);
        if (!previewOnly) await sleep(segment.duration);
      }

      async function showRecording(segment, previewOnly = false) {
        guide.hidden = true;
        source.hidden = false;
        setOverlay(segment);
        await seek(segment.start + (previewOnly ? 0.15 : 0));
        if (previewOnly) return;
        await source.play();
        await new Promise((resolve) => {
          let complete = false;
          const finish = () => {
            if (complete) return;
            complete = true;
            source.pause();
            source.removeEventListener("timeupdate", onTimeUpdate);
            resolve();
          };
          const onTimeUpdate = () => {
            if (source.currentTime >= segment.end) finish();
          };
          source.addEventListener("timeupdate", onTimeUpdate);
          setTimeout(finish, Math.ceil((segment.end - segment.start + 0.8) * 1000));
        });
      }

      async function renderSegment(segment, previewOnly = false) {
        if (segment.type === "guide") {
          await showGuide(segment, previewOnly);
          return;
        }
        await showRecording(segment, previewOnly);
      }

      window.preparePoster = async () => {
        await renderSegment(segments[0], true);
      };

      window.startDemo = async () => {
        window.demoDone = false;
        for (const segment of segments) {
          await renderSegment(segment);
        }
        window.demoDone = true;
      };

      waitForVideoReady().then(() => {
        window.demoReady = true;
      });
    </script>
  </body>
</html>`;
}

function videoDurationMs(video) {
  return video.segments.reduce((total, segment) => {
    if (segment.type === "guide") return total + segment.duration;
    return total + Math.ceil((segment.end - segment.start + 0.8) * 1000);
  }, 0);
}

async function recordVideo(browser, video) {
  const videoTempDir = path.join(tempDir, path.basename(video.file, ".webm"));
  fs.rmSync(videoTempDir, { recursive: true, force: true });
  fs.mkdirSync(videoTempDir, { recursive: true });

  const htmlPath = path.join(videoTempDir, "index.html");
  fs.writeFileSync(htmlPath, renderHtml(video));

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: videoTempDir, size: { width: 1280, height: 720 } }
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(htmlPath).href);
  await page.waitForFunction(() => window.demoReady === true, null, { timeout: 30000 });
  await page.evaluate(() => window.preparePoster());
  await page.waitForTimeout(400);

  const posterName = video.file.replace(".webm", "-poster.png");
  await page.screenshot({ path: path.join(publicAssets, posterName), fullPage: false });
  if (video.file === "setup-windows.webm") {
    fs.copyFileSync(path.join(publicAssets, posterName), path.join(publicAssets, "setup-video-poster.png"));
  }

  await page.evaluate(() => window.startDemo());
  await page.waitForFunction(() => window.demoDone === true, null, { timeout: videoDurationMs(video) + 20000 });
  await page.waitForTimeout(500);
  await context.close();

  const generated = fs
    .readdirSync(videoTempDir)
    .filter((file) => file.endsWith(".webm"))
    .map((file) => path.join(videoTempDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

  if (!generated) {
    throw new Error(`No video generated for ${video.file}`);
  }

  const outputPath = path.join(publicAssets, video.file);
  fs.copyFileSync(generated, outputPath);
  console.log(`Wrote ${outputPath}`);
}

async function run() {
  if (!fs.existsSync(sourceRecordingPath)) {
    throw new Error(`Missing setup recording: ${sourceRecordingPath}`);
  }

  fs.mkdirSync(publicAssets, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required", "--window-size=1280,720"]
  });

  for (const video of videos) {
    await recordVideo(browser, video);
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
