const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export function demoBanner(title: string, subtitle?: string): void {
  const line = "═".repeat(Math.max(title.length + 4, 52));
  console.log(`\n${CYAN}${line}${RESET}`);
  console.log(`${CYAN}  ${title}${RESET}`);
  if (subtitle) console.log(`${DIM}  ${subtitle}${RESET}`);
  console.log(`${CYAN}${line}${RESET}\n`);
}

export function demoStep(current: number, total: number, label: string): void {
  console.log(`${GREEN}[${current}/${total}]${RESET} ${label}`);
}

export function demoInfo(label: string, value: string): void {
  console.log(`  ${DIM}${label}:${RESET} ${value}`);
}

export function demoOk(message: string): void {
  console.log(`  ${GREEN}✓${RESET} ${message}`);
}

export function demoSkip(message: string): void {
  console.log(`  ${YELLOW}○${RESET} ${message}`);
}

export function demoPreview(label: string, text: string, max = 320): void {
  const preview = text.length > max ? `${text.slice(0, max)}…` : text;
  console.log(`  ${DIM}${label}:${RESET}`);
  for (const line of preview.split("\n")) {
    console.log(`    ${line}`);
  }
}

export function demoSummary(rows: Record<string, string>): void {
  console.log(`\n${CYAN}── RESULT ──${RESET}`);
  const width = Math.max(...Object.keys(rows).map((k) => k.length), 8);
  for (const [key, value] of Object.entries(rows)) {
    console.log(`  ${key.padEnd(width)}  ${value}`);
  }
  console.log(`${GREEN}  Status: PASS (exit 0)${RESET}\n`);
}

export interface AgentMemoryRow {
  agentId: string;
  memoryId: string;
  walrusBlobId: string;
  hitSource: string;
}

export function demoAgentTable(rows: AgentMemoryRow[]): void {
  console.log(`\n${CYAN}── SHARED MEMORY (agents × Walrus) ──${RESET}`);
  console.log(
    `  ${"agentId".padEnd(18)}${"memoryId".padEnd(14)}${"walrusBlobId".padEnd(26)}hitSource`,
  );
  for (const row of rows) {
    const mid =
      row.memoryId.length > 12 ? `${row.memoryId.slice(0, 8)}…` : row.memoryId;
    const blob =
      row.walrusBlobId === "—"
        ? "—"
        : row.walrusBlobId.length > 24
          ? `${row.walrusBlobId.slice(0, 22)}…`
          : row.walrusBlobId;
    console.log(
      `  ${row.agentId.padEnd(18)}${mid.padEnd(14)}${blob.padEnd(26)}${row.hitSource}`,
    );
  }
  console.log("");
}
