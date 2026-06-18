#!/usr/bin/env node
/**
 * Bundle @memwalpp/mcp for npm — inlines @memwalpp/* workspace; keeps native/heavy deps external.
 */
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, "..");

const external = [
  "better-sqlite3",
  "@modelcontextprotocol/sdk",
  "express",
  "zod",
  "@mysten-incubation/memwal",
  "@mysten/sui",
];

await esbuild.build({
  entryPoints: [path.join(pkgRoot, "src/cli.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(pkgRoot, "dist/bundle.mjs"),
  external,
  logLevel: "info",
});

console.log("bundled → dist/bundle.mjs");
