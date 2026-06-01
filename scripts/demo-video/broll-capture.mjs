import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

import { classifyLine, filterTerminalLines, stripAnsi } from "./lib/strip-ansi.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const TERMINAL_HTML = join(__dirname, "terminal-player.html");

/** @typedef {{ id: string, path: string, durationSec: number }} BrollClip */

/**
 * @param {string} FFMPEG
 * @param {string} workDir
 * @param {{ fresh?: boolean }} opts
 */
export async function captureAllBroll(FFMPEG, workDir, opts = {}) {
  const brollDir = join(workDir, "broll");
  mkdirSync(brollDir, { recursive: true });

  const specs = [
    {
      id: "agent-demo",
      type: "terminal",
      command: "pnpm agent:demo",
      title: "pnpm agent:demo",
      targetSec: 20,
    },
    {
      id: "bounty-hunt",
      type: "terminal",
      command: "pnpm agent:bounty-hunt",
      title: "pnpm agent:bounty-hunt",
      targetSec: 22,
    },
    {
      id: "mcp-e2e",
      type: "terminal",
      command: "pnpm mcp:e2e",
      title: "pnpm mcp:e2e",
      targetSec: 16,
    },
    {
      id: "dashboard",
      type: "url",
      url: "https://memwalpp-dashboard.vercel.app/",
      durationSec: 14,
    },
    {
      id: "architecture-svg",
      type: "svg",
      svg: join(ROOT, "docs/diagrams/memwalpp-merged-architecture.svg"),
      durationSec: 14,
    },
    {
      id: "suiscan-bootstrap",
      type: "url",
      url: "https://suiscan.xyz/mainnet/tx/BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW",
      durationSec: 12,
    },
  ];

  /** @type {Map<string, BrollClip>} */
  const clips = new Map();

  for (const spec of specs) {
    const out = join(brollDir, `${spec.id}.mp4`);
    if (!opts.fresh && existsSync(out)) {
      clips.set(spec.id, { id: spec.id, path: out, durationSec: probeDuration(FFMPEG, out) ?? spec.targetSec ?? spec.durationSec ?? 14 });
      console.log(`  cache ${spec.id}`);
      continue;
    }

    console.log(`  record ${spec.id}…`);
    if (spec.type === "terminal") {
      const lines = await captureCommandOutput(spec.command, ROOT);
      await recordTerminalVideo(spec, lines, out, FFMPEG);
    } else if (spec.type === "url") {
      await recordUrlVideo(spec, out, FFMPEG);
    } else if (spec.type === "svg") {
      await recordSvgVideo(spec, out, FFMPEG);
    }

    clips.set(spec.id, {
      id: spec.id,
      path: out,
      durationSec: probeDuration(FFMPEG, out) ?? spec.targetSec ?? spec.durationSec ?? 14,
    });
  }

  return clips;
}

/** Map segment broll field → clip id */
export function brollKeyToId(broll) {
  if (!broll) return null;
  if (broll.startsWith("terminal:pnpm agent:demo")) return "agent-demo";
  if (broll.startsWith("terminal:pnpm agent:bounty-hunt")) return "bounty-hunt";
  if (broll.startsWith("terminal:pnpm mcp:e2e")) return "mcp-e2e";
  if (broll.startsWith("http") && broll.includes("dashboard")) return "dashboard";
  if (broll.startsWith("http") && broll.includes("suiscan")) return "suiscan-bootstrap";
  if (broll.endsWith(".svg")) return "architecture-svg";
  return null;
}

function probeDuration(FFMPEG, path) {
  const r = spawnSync(FFMPEG, ["-i", path, "-f", "null", "-"], { encoding: "utf-8" });
  for (const line of (r.stderr ?? "").split("\n")) {
    if (line.includes("Duration:")) {
      const ts = line.split("Duration:")[1].split(",")[0].trim();
      const [h, m, s] = ts.split(":");
      return Number(h) * 3600 + Number(m) * 60 + Number(parseFloat(s));
    }
  }
  return null;
}

function captureCommandOutput(command, cwd) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const proc = spawn(command, {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    });
    proc.stdout.on("data", (d) => chunks.push(d));
    proc.stderr.on("data", (d) => chunks.push(d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      const raw = stripAnsi(Buffer.concat(chunks).toString("utf-8"));
      const filtered = filterTerminalLines(raw.split("\n"));
      const lines = filtered.map((text) => ({ text, class: classifyLine(text) }));
      resolve({ lines, exitCode: code ?? 0 });
    });
  });
}

async function recordTerminalVideo(spec, { lines }, outPath, FFMPEG) {
  const tmpDir = join(dirname(outPath), `_tmp-${spec.id}`);
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const lineDelayMs = Math.max(55, Math.min(160, Math.floor((spec.targetSec * 1000) / Math.max(lines.length, 1))));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 960, height: 540 },
    recordVideo: { dir: tmpDir, size: { width: 960, height: 540 } },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(TERMINAL_HTML).href, { waitUntil: "load" });
  await page.evaluate(
    async ({ title, command, lines, lineDelayMs }) => {
      window.__terminalDone = false;
      await window.playTerminal({ title, command, lines, lineDelayMs });
    },
    { title: spec.title, command: spec.command, lines, lineDelayMs },
  );
  await page.waitForFunction(() => window.__terminalDone === true, { timeout: 120000 });
  await page.waitForTimeout(400);
  const video = page.video();
  await context.close();
  await browser.close();

  const webm = await findNewestWebm(tmpDir);
  webmToMp4(FFMPEG, webm, outPath);
  rmSync(tmpDir, { recursive: true, force: true });
}

async function recordUrlVideo(spec, outPath, FFMPEG) {
  const tmpDir = join(dirname(outPath), `_tmp-${spec.id}`);
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: tmpDir, size: { width: 1280, height: 720 } },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.goto(spec.url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);

  if (spec.id === "dashboard") {
    await page.evaluate(async () => {
      window.scrollTo({ top: 0, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 800));
      window.scrollTo({ top: 420, behavior: "smooth" });
      await new Promise((r) => setTimeout(r, 2200));
      window.scrollTo({ top: 900, behavior: "smooth" });
    });
  } else {
    await page.evaluate(async () => {
      for (let y = 0; y < 600; y += 80) {
        window.scrollTo({ top: y, behavior: "smooth" });
        await new Promise((r) => setTimeout(r, 350));
      }
    });
  }

  await page.waitForTimeout((spec.durationSec ?? 12) * 1000 - 3000);
  await context.close();
  await browser.close();

  const webm = await findNewestWebm(tmpDir);
  webmToMp4(FFMPEG, webm, outPath);
  rmSync(tmpDir, { recursive: true, force: true });
}

async function recordSvgVideo(spec, outPath, FFMPEG) {
  const tmpDir = join(dirname(outPath), `_tmp-${spec.id}`);
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const svg = readFileSync(spec.svg, "utf-8");
  const htmlPath = join(tmpDir, "svg-view.html");
  writeFileSync(
    htmlPath,
    `<!DOCTYPE html><html><head><style>
      html,body{margin:0;height:100%;background:#05050a;overflow:hidden;display:flex;align-items:center;justify-content:center}
      .wrap{animation:zoom ${spec.durationSec}s ease-in-out forwards;filter:drop-shadow(0 0 48px rgba(0,245,255,.15))}
      svg{max-width:92vw;max-height:88vh}
      @keyframes zoom{from{transform:scale(.96)}to{transform:scale(1.04)}}
    </style></head><body><div class="wrap">${svg}</div></body></html>`,
    "utf-8",
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: tmpDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.waitForTimeout((spec.durationSec ?? 14) * 1000);
  await context.close();
  await browser.close();

  const webm = await findNewestWebm(tmpDir);
  webmToMp4(FFMPEG, webm, outPath);
}

function findNewestWebm(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error(`No webm in ${dir}`);
  return join(dir, files[files.length - 1]);
}

function webmToMp4(FFMPEG, webm, mp4) {
  const r = spawnSync(
    FFMPEG,
    ["-y", "-i", webm, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-an", mp4],
    { stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error(`webm→mp4 failed: ${webm}`);
}
