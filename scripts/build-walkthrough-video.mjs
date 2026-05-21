import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicAssets = path.join(repoRoot, "public", "assets");
const tempDir = path.join(repoRoot, ".video-work");
const sourceHtml = path.join(tempDir, "setup-video.html");
const outputVideo = path.join(publicAssets, "setup-walkthrough.webm");
const posterPath = path.join(publicAssets, "setup-video-poster.png");

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

function assetUrl(fileName) {
  return pathToFileURL(path.join(publicAssets, fileName)).href;
}

function writeSourceHtml() {
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(publicAssets, { recursive: true });

  const html = `<!doctype html>
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
        background: #f7f5ef;
        color: #171717;
        font-family: "Segoe UI", sans-serif;
      }
      .stage {
        position: relative;
        width: 1280px;
        height: 720px;
      }
      .slide {
        position: absolute;
        inset: 0;
        display: grid;
        grid-template-columns: 470px 1fr;
        gap: 46px;
        padding: 56px;
        opacity: 0;
        transform: translateX(36px);
        transition: opacity 600ms ease, transform 600ms ease;
      }
      .slide.active {
        opacity: 1;
        transform: translateX(0);
      }
      h1 {
        font-family: Georgia, serif;
        font-size: 64px;
        line-height: 1.02;
        margin: 0 0 22px;
      }
      p {
        font-size: 27px;
        line-height: 1.25;
        margin: 0;
        color: #4b463e;
      }
      .eyebrow {
        color: #9d2f1f;
        font-weight: 900;
        letter-spacing: 0.08em;
        font-size: 18px;
        text-transform: uppercase;
        margin-bottom: 16px;
      }
      .visual {
        border: 2px solid #d8d1c4;
        border-radius: 8px;
        background: #fffefa;
        display: grid;
        place-items: center;
        padding: 24px;
        box-shadow: 0 18px 55px rgba(23, 23, 23, 0.12);
      }
      .visual img {
        max-width: 100%;
        max-height: 540px;
        object-fit: contain;
        border: 1px solid #d8d1c4;
      }
      .mock {
        width: 100%;
        padding: 30px;
        border: 1px solid #d8d1c4;
        background: white;
      }
      .bar {
        height: 52px;
        border: 2px solid #171717;
        display: flex;
        align-items: center;
        padding: 0 18px;
        margin-bottom: 18px;
        font-size: 22px;
        font-weight: 800;
      }
      .toggle {
        margin-left: auto;
        width: 72px;
        height: 34px;
        border-radius: 999px;
        background: #171717;
      }
      .button {
        display: inline-block;
        padding: 16px 22px;
        border-radius: 8px;
        background: #c9422b;
        color: white;
        font-weight: 900;
        font-size: 24px;
        margin-top: 20px;
      }
      .folder {
        border: 2px solid #171717;
        padding: 26px;
        font-size: 26px;
        font-weight: 800;
      }
      .footer-note {
        position: absolute;
        left: 56px;
        bottom: 34px;
        font-size: 20px;
        color: #615d55;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="stage">
      <section class="slide active">
        <div>
          <div class="eyebrow">Step 1</div>
          <h1>Pay, then keep your key.</h1>
          <p>After checkout, the success page shows your license key and the Windows, Mac, and raw extension downloads.</p>
        </div>
        <div class="visual"><div class="mock"><div class="bar">TBX-KEY-READY <span class="toggle"></span></div><p>Choose Windows or Mac, then save your license key for recovery.</p><span class="button">Download for Windows</span></div></div>
      </section>
      <section class="slide">
        <div>
          <div class="eyebrow">Step 2</div>
          <h1>Run the installer file.</h1>
          <p>Windows uses a .cmd file. Mac uses a .command file. It prepares the extension folder for Chrome.</p>
        </div>
        <div class="visual"><div class="folder">TimeboxYouTubeBlockerExtension<br><br>manifest.json<br>background.js<br>popup.html</div></div>
      </section>
      <section class="slide">
        <div>
          <div class="eyebrow">Step 3</div>
          <h1>Open Chrome extensions.</h1>
          <p>Turn on Developer mode, click Load unpacked, and choose the folder the installer opened.</p>
        </div>
        <div class="visual"><div class="mock"><div class="bar">chrome://extensions <span class="toggle"></span></div><p><strong>Developer mode</strong> on</p><span class="button">Load unpacked</span></div></div>
      </section>
      <section class="slide">
        <div>
          <div class="eyebrow">Step 4</div>
          <h1>Test it on YouTube.</h1>
          <p>YouTube should show the Timebox blocked screen. Use Give me a break only when you want a 20-minute break.</p>
        </div>
        <div class="visual"><img src="${assetUrl("blocked-page.png")}" alt=""></div>
      </section>
      <section class="slide">
        <div>
          <div class="eyebrow">Step 5</div>
          <h1>Three breaks per day.</h1>
          <p>The popup shows the active timer and how many breaks are left. When the timer ends, YouTube blocks again.</p>
        </div>
        <div class="visual"><img src="${assetUrl("popup-states.png")}" alt=""></div>
      </section>
      <div class="footer-note">Timebox YouTube Blocker setup walkthrough</div>
    </div>
    <script>
      const slides = [...document.querySelectorAll(".slide")];
      let index = 0;
      setInterval(() => {
        slides[index].classList.remove("active");
        index = (index + 1) % slides.length;
        slides[index].classList.add("active");
      }, 4500);
    </script>
  </body>
</html>`;

  fs.writeFileSync(sourceHtml, html);
}

async function run() {
  writeSourceHtml();
  fs.rmSync(outputVideo, { force: true });
  fs.rmSync(posterPath, { force: true });

  const browser = await chromium.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--window-size=1280,720"]
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: tempDir, size: { width: 1280, height: 720 } }
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(sourceHtml).href);
  await page.screenshot({ path: posterPath, fullPage: false });
  await page.waitForTimeout(23500);
  await context.close();
  await browser.close();

  const videoFile = fs
    .readdirSync(tempDir)
    .filter((file) => file.endsWith(".webm"))
    .map((file) => path.join(tempDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

  if (!videoFile) {
    throw new Error("Playwright did not create a video file.");
  }

  fs.copyFileSync(videoFile, outputVideo);
  console.log(`Wrote ${outputVideo}`);
  console.log(`Wrote ${posterPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
