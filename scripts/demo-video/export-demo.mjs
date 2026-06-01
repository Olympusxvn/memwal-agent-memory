#!/usr/bin/env node
/**
 * Export MemWal++ demo video: slide PNGs + voiceover MP3 -> memwalpp-demo.mp4
 *
 * Usage:
 *   node scripts/demo-video/export-demo.mjs
 *   node scripts/demo-video/export-demo.mjs --locale vi
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SLIDES_HTML = join(ROOT, "docs/memwalpp-slides.html");
const FFMPEG = ffmpegInstaller.path;

const locale = process.argv.includes("--locale")
  ? process.argv[process.argv.indexOf("--locale") + 1] ?? "en"
  : "en";

const OUT = join(ROOT, "docs/demo-video-output", locale);
const WORK = join(OUT, "export-work");
const MANIFEST = join(OUT, "manifest.json");
const FINAL = join(OUT, "memwalpp-demo.mp4");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) {
    throw new Error(`${cmd} failed (${r.status})`);
  }
}

function probeDurationSec(audioPath) {
  const r = spawnSync(FFMPEG, ["-i", audioPath, "-f", "null", "-"], {
    encoding: "utf-8",
  });
  for (const line of (r.stderr ?? "").split("\n")) {
    if (line.includes("Duration:")) {
      const ts = line.split("Duration:")[1].split(",")[0].trim();
      const [h, m, s] = ts.split(":");
      return Number(h) * 3600 + Number(m) * 60 + Number(parseFloat(s));
    }
  }
  return null;
}

async function captureSlides() {
  const slidesDir = join(WORK, "slides");
  mkdirSync(slidesDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(pathToFileURL(SLIDES_HTML).href, { waitUntil: "networkidle" });

  await page.addStyleTag({
    content: `.nav, .vo-wrap, .progress-bar { display: none !important; }
      .slides { flex: 1; }
      .deck { height: 100vh; }`,
  });

  const total = await page.evaluate(() => document.querySelectorAll(".slide").length);

  for (let i = 0; i < total; i++) {
    await page.evaluate((n) => {
      document.querySelectorAll(".slide").forEach((s, idx) => {
        s.classList.remove("active", "exit");
        if (idx === n) s.classList.add("active");
      });
    }, i);
    await page.waitForTimeout(450);
    const out = join(slidesDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
    await page.screenshot({ path: out });
    console.log(`  slide ${i + 1}/${total}`);
  }

  await browser.close();
  return slidesDir;
}

async function main() {
  if (!existsSync(MANIFEST)) {
    console.error(`Missing ${MANIFEST} — run: pnpm demo:voiceover`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST, "utf-8"));
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });

  console.log(`\nExport MemWal++ demo (${locale})\n1/3 Capture slides…`);
  const slidesDir = await captureSlides();

  console.log("2/3 Build segments…");
  const segDir = join(WORK, "segments");
  mkdirSync(segDir, { recursive: true });
  const lines = [];

  for (const seg of manifest.segments) {
    const slideNum = String(seg.slide).padStart(2, "0");
    const png = join(slidesDir, `slide-${slideNum}.png`);
    const audio = join(OUT, seg.file);
    if (!existsSync(audio)) {
      console.error(`Missing ${audio} — run: pnpm demo:voiceover`);
      process.exit(1);
    }

    const dur = probeDurationSec(audio) ?? seg.durationSec;
    const segOut = join(segDir, `${seg.id}.mp4`);

    run(FFMPEG, [
      "-y",
      "-loop",
      "1",
      "-framerate",
      "30",
      "-i",
      png,
      "-i",
      audio,
      "-c:v",
      "libx264",
      "-tune",
      "stillimage",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      String(dur + 0.05),
      "-shortest",
      segOut,
    ]);

    lines.push(`file '${segOut.replace(/\\/g, "/")}'`);
    console.log(`  ${seg.id} (${dur.toFixed(1)}s)`);
  }

  const listFile = join(WORK, "concat.txt");
  writeFileSync(listFile, lines.join("\n"));

  console.log("3/3 Concat → memwalpp-demo.mp4");
  run(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", FINAL]);

  const sizeMb = (readFileSync(FINAL).length / (1024 * 1024)).toFixed(1);
  console.log(`\nDone: ${FINAL}\n  ${sizeMb} MB · ~${manifest.totalDurationSec}s\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
