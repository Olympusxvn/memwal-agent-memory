#!/usr/bin/env node
/**
 * Sync docs/doc-map.html (+ assets) → apps/dashboard/public/doc-hub/
 * for https://memwalpp-dashboard.vercel.app/doc-hub/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO_BLOB = "https://github.com/Olympusxvn/memwal-agent-memory/blob/main";
const LIVE_DOC_HUB = "https://memwalpp-dashboard.vercel.app/doc-hub/";

const srcHtml = path.join(ROOT, "docs/doc-map.html");
const outDir = path.join(ROOT, "apps/dashboard/public/doc-hub");
const outHtml = path.join(outDir, "index.html");

function githubDoc(rel) {
  if (rel.startsWith("../")) return `${REPO_BLOB}/${rel.slice(3)}`;
  return `${REPO_BLOB}/docs/${rel}`;
}

/** Rewrite repo-relative markdown links for static hosting (no .md files on Vercel). */
function adaptForDashboard(html) {
  const mdMap = [
    ["../JUDGE_GUIDE.md", githubDoc("../JUDGE_GUIDE.md")],
    ["../SUBMISSION.md", githubDoc("../SUBMISSION.md")],
    ["../SUMMARY.md", githubDoc("../SUMMARY.md")],
    ["../README.md", githubDoc("../README.md")],
    ["../ROADMAP.md", githubDoc("../ROADMAP.md")],
    ["../CHANGELOG.md", githubDoc("../CHANGELOG.md")],
    ["../packages/sui-contracts/README.md", githubDoc("../packages/sui-contracts/README.md")],
    ["deploy.md", githubDoc("deploy.md")],
    ["ARCHITECTURE.md", githubDoc("ARCHITECTURE.md")],
    ["judge-walrus-memory-workshop.md", githubDoc("judge-walrus-memory-workshop.md")],
    ["judge-final-checklist.md", githubDoc("judge-final-checklist.md")],
    ["PROJECT-STRUCTURE.md", githubDoc("PROJECT-STRUCTURE.md")],
    ["walrus-memory-alignment.md", githubDoc("walrus-memory-alignment.md")],
    ["mcp-setup.md", githubDoc("mcp-setup.md")],
    ["specs/openspec-memwal-agent-memory.md", githubDoc("specs/openspec-memwal-agent-memory.md")],
    ["specs/openspec-mcp-server.md", githubDoc("specs/openspec-mcp-server.md")],
    ["specs/openspec-move-contracts-refactor.md", githubDoc("specs/openspec-move-contracts-refactor.md")],
    ["decisions/ADR-013.md", githubDoc("decisions/ADR-013.md")],
    ["product/README.md", githubDoc("product/README.md")],
  ];

  let out = html;
  for (const [from, to] of mdMap) {
    out = out.replaceAll(`href="${from}"`, `href="${to}"`);
  }

  out = out.replaceAll('href="memwalpp-slides.html"', 'href="/memwalpp-slides.html"');
  out = out.replaceAll('href="product/landing.html"', 'href="https://memwalpp-dashboard.vercel.app/product"');

  // Same-origin nav when served from Vercel /doc-hub/
  const dash = "https://memwalpp-dashboard.vercel.app";
  out = out.replaceAll(`href="${dash}/"`, 'href="/"');
  out = out.replaceAll(`href="${dash}/summary"`, 'href="/summary"');
  out = out.replaceAll(`href="${dash}/kiosk"`, 'href="/kiosk"');
  out = out.replaceAll(`href="${dash}/product"`, 'href="/product"');
  out = out.replaceAll(`href="${dash}/doc-hub/"`, 'href="/doc-hub/"');

  if (!out.includes('rel="canonical"')) {
    out = out.replace(
      "</head>",
      `  <link rel="canonical" href="${LIVE_DOC_HUB}" />\n</head>`,
    );
  }

  return out;
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

const html = fs.readFileSync(srcHtml, "utf8");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outHtml, adaptForDashboard(html), "utf8");

copyFile(
  path.join(ROOT, "docs/memwalpp-slides.html"),
  path.join(outDir, "slides.html"),
);
copyFile(
  path.join(ROOT, "docs/memwalpp-slides.html"),
  path.join(ROOT, "apps/dashboard/public/memwalpp-slides.html"),
);
copyFile(
  path.join(ROOT, "docs/diagrams/memwalpp-merged-architecture.svg"),
  path.join(outDir, "diagrams/memwalpp-merged-architecture.svg"),
);

console.log(`doc-hub synced → ${path.relative(ROOT, outDir)}/`);
console.log(`slides synced → apps/dashboard/public/memwalpp-slides.html`);
