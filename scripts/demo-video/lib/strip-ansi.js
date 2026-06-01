/** Strip ANSI escape codes from terminal output. */
export function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, "").replace(/\r/g, "");
}

export function classifyLine(line) {
  const t = line.trim();
  if (!t) return "blank";
  if (t.includes("── RESULT ──") || t.includes("Status: PASS")) return "result";
  if (t.includes("✓") || t.includes("PASS")) return "ok";
  if (t.includes("○") || t.includes("Skipped")) return "warn";
  if (t.includes("[hook]") || /^\[\d+\/\d+\]/.test(t)) return "hook";
  if (t.startsWith("pnpm ") || t.includes("git clone")) return "cmd";
  if (t.includes("✗") || t.includes("FAIL")) return "err";
  if (t.startsWith("  ") || t.startsWith("\t")) return "dim";
  if (t.includes("═══") || t.includes("MemWal")) return "head";
  return "text";
}

export function filterTerminalLines(rawLines, maxLines = 48) {
  const lines = rawLines
    .map(stripAnsi)
    .flatMap((l) => l.split("\n"))
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));

  if (lines.length <= maxLines) return lines;

  const head = lines.slice(0, 6);
  const tail = lines.slice(-8);
  const keywords = /RESULT|PASS|hook|poster|hunter|blob|fulfillment|✓|Tests|passed/i;
  const mid = lines.filter((l) => keywords.test(l)).slice(0, maxLines - head.length - tail.length - 1);
  return [...head, "  …", ...mid, ...tail];
}
