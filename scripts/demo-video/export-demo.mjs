#!/usr/bin/env node
/**
 * Export MemWal++ demo video: slides + TTS + auto B-roll PiP → memwalpp-demo.mp4
 *
 * Usage:
 *   node scripts/demo-video/export-demo.mjs
 *   node scripts/demo-video/export-demo.mjs --locale vi
 *   node scripts/demo-video/export-demo.mjs --skip-broll   # slides only (fast)
 *   node scripts/demo-video/export-demo.mjs --fresh-broll  # re-record B-roll
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { chromium } from "playwright";

import { brollKeyToId, captureAllBroll } from "./broll-capture.mjs";
import { renderSegment } from "./composite.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SLIDES_HTML = join(ROOT, "docs/memwalpp-slides.html");
const FFMPEG = ffmpegInstaller.path;

const args = process.argv.slice(2);
const locale = args.includes("--locale") ? args[args.indexOf("--locale") + 1] ?? "en" : "en";
const skipBroll = args.includes("--skip-broll");
const freshBroll = args.includes("--fresh-broll");

const OUT = join(ROOT, "docs/demo-video-output", locale);
const WORK = join(OUT, "export-work");
const MANIFEST = join(OUT, "manifest.json");
const FINAL = join(OUT, "memwalpp-demo.mp4");
const PUBLISH_COPY = join(ROOT, "docs/memwalpp-demo.mp4");

function probeDurationSec(audioPath) {
  const r = spawnSync(FFMPEG, ["-i", audioPath, "-f", "null", "-"], { encoding: "utf-8" });
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
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
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
    await page.screenshot({ path: join(slidesDir, `slide-${String(i + 1).padStart(2, "0")}.png`) });
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
  const voiceCfg = JSON.parse(readFileSync(join(__dirname, "voiceover.json"), "utf-8"));
  const brollById = Object.fromEntries(voiceCfg.segments.map((s) => [s.id, s.broll]));
  for (const seg of manifest.segments) {
    if (brollById[seg.id]) seg.broll = brollById[seg.id];
  }
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });

  console.log(`\n🎬 Export MemWal++ demo (${locale})${skipBroll ? " [no B-roll]" : " + B-roll PiP"}\n`);

  console.log("1/4 Capture slides…");
  const slidesDir = await captureSlides();

  /** @type {Map<string, { path: string }> | null} */
  let brollClips = null;
  if (!skipBroll) {
    console.log("2/4 Capture B-roll (terminal · dashboard · diagram)…");
    try {
      brollClips = await captureAllBroll(FFMPEG, WORK, { fresh: freshBroll });
    } catch (e) {
      console.warn("  B-roll capture partial fail:", e.message);
      console.warn("  Continuing with available clips…");
      brollClips = brollClips ?? new Map();
    }
  } else {
    console.log("2/4 Skip B-roll");
  }

  console.log("3/4 Render segments…");
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

    let brollPath = null;
    if (brollClips && seg.broll) {
      const id = brollKeyToId(seg.broll);
      const clip = id ? brollClips.get(id) : null;
      if (clip?.path && existsSync(clip.path)) brollPath = clip.path;
    }

    renderSegment({
      FFMPEG,
      png,
      audio,
      dur,
      segOut,
      brollPath,
      kenBurns: !brollPath,
    });

    const tag = brollPath ? "PiP" : "KB";
    lines.push(`file '${segOut.replace(/\\/g, "/")}'`);
    console.log(`  ${seg.id} (${dur.toFixed(1)}s) [${tag}]`);
  }

  const listFile = join(WORK, "concat.txt");
  writeFileSync(listFile, lines.join("\n"));

  console.log("4/4 Concat → memwalpp-demo.mp4");
  spawnSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", FINAL], {
    stdio: "inherit",
  });

  if (locale === "en" && existsSync(FINAL)) {
    copyFileSync(FINAL, PUBLISH_COPY);
  }

  const sizeMb = (readFileSync(FINAL).length / (1024 * 1024)).toFixed(1);
  console.log(`\n✅ Done: ${FINAL}`);
  console.log(`   ${sizeMb} MB · ~${manifest.totalDurationSec}s`);
  if (locale === "en") console.log(`   Published copy: ${PUBLISH_COPY}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
