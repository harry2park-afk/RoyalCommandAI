import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";

// Exact reviewed statements only; new mutations in these files still fail.
const reviewed = JSON.parse(readFileSync(new URL("./conflict-guard-reviewed-lines.json", import.meta.url), "utf8"));
function reviewedLine(file, rule, line) {
  const entries = reviewed[file]?.[rule];
  return Array.isArray(entries) && entries.every(value => typeof value === "string") && entries.includes(line.slice(1).trim());
}

const base = process.env.CONFLICT_GUARD_BASE || "HEAD^";
const head = process.env.CONFLICT_GUARD_HEAD || "HEAD";
const strict = process.env.CONFLICT_GUARD_STRICT === "1";

// Stream large PR diffs instead of collecting them in execFileSync's 1 MiB
// default buffer. Keep at most one line and one file's match flags in memory.
async function* gitLines(args) {
  const child = spawn("git", args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-4096); });
  // Resolve errors as values until stdout is drained, avoiding unhandled rejection.
  const result = new Promise(resolve => {
    child.once("error", error => resolve({ error }));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  try {
    for await (const line of lines) yield line;
    const outcome = await result;
    if (outcome.error) throw outcome.error;
    if (outcome.code !== 0) throw new Error(`git failed (${outcome.code ?? outcome.signal}): ${stderr.trim()}`);
  } finally {
    lines.close();
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
}

function warning(message) {
  console.log(`::warning title=Royal Command Conflict Guard::${message}`);
}

function failure(message) {
  console.log(`::error title=Royal Command Conflict Guard::${message}`);
}

const rules = [
  {
    name: "Language picker",
    owners: ["public/rc-language-picker.js", "public/rc-language-dock-fix.js"],
    patterns: [/rc-lang-picker/i, /selected-language/i, /aria-label=["']Language["']/i],
  },
  {
    name: "Compact AI dock",
    owners: ["public/rc-compact-ai-dock.js", "src/app/rooms/[id]/RoomV3.tsx", "src/app/api/user/preferences/route.ts"],
    patterns: [/compactAiDock/i, /compact-ai-dock/i, /aiSlots/i, /selectedAi/i],
  },
  {
    name: "Right work sidebar",
    owners: ["src/app/rooms/[id]/RightWorkSidebar.tsx", "src/app/api/user/preferences/route.ts"],
    patterns: [/rightPanelApps/i, /right-panel-apps/i, /rc-right-/i],
  },
  {
    name: "Conversation controls",
    owners: ["src/app/rooms/[id]/ChatHistorySidebar.tsx", "public/rc-sidebar-actions-compact.js"],
    patterns: [/Delete selected/i, /Save selected/i, /selectedBoxes/i, /rc-sidebar-actions/i],
  },
  {
    name: "Chat scroll",
    owners: ["src/app/rooms/[id]/RoomV3.tsx", "public/rc-chat-scroll-unlock.js"],
    patterns: [/messagesViewportRef/i, /rc-chat-scroll-unlock/i, /scrollTo\s*\(/i],
  },
];

try {
  let changedFiles = 0;
  for await (const name of gitLines(["diff", "--name-only", base, head])) if (name) changedFiles++;
  let count = 0;
  let file = null;
  let inHunk = false;
  const matched = new Set();
  const risky = new Set();
  function flush() {
    if (!file) return;
    for (const rule of matched) {
      warning(`${rule.name}: ${file} adds direct control of a surface owned by ${rule.owners.join(", ")}. Review for duplicate ownership.`);
      count++;
    }
    if (risky.size) {
      warning(`${file} adds ${[...risky].join(", ")}. Confirm this file is the sole owner of the affected DOM/state before merge.`);
      count++;
    }
    file = null; matched.clear(); risky.clear();
  }
  for await (const line of gitLines(["-c", "core.quotePath=false", "diff", "--src-prefix=a/", "--dst-prefix=b/", "--no-ext-diff", "--no-textconv", "--unified=0", base, head, "--", "*.js", "*.mjs", "*.ts", "*.tsx"])) {
    if (line.startsWith("diff --git ")) { flush(); inHunk=false; continue; }
    if (line.startsWith("@@ ")) { inHunk=true; continue; }
    if (!inHunk && line.startsWith("+++ ")) {
      let path = line.slice(4);
      if (path === "/dev/null") continue;
      if (path.startsWith('"')) path = JSON.parse(path.replace(/\\(?:[av]|\\|")/g, escape => escape === '\\a' ? '\\u0007' : escape === '\\v' ? '\\u000b' : escape));
      if (!path.startsWith("b/")) throw new Error("Unrecognised diff path");
      file = path.slice(2); continue;
    }
    if (!file || !line.startsWith("+")) continue;
    for (const rule of rules) {
      if (!rule.owners.includes(file) && !reviewedLine(file, rule.name, line) && rule.patterns.some(pattern => pattern.test(line))) matched.add(rule);
    }
    if (/src\/app\/rooms\/|public\/rc-/.test(file)) {
      if (/new\s+MutationObserver/i.test(line)) risky.add("MutationObserver");
      if (/\.appendChild\s*\(/i.test(line)) risky.add("appendChild");
      if (/\.insertBefore\s*\(/i.test(line)) risky.add("insertBefore");
      if (/\.scrollTo\s*\(/i.test(line) && !reviewedLine(file, "forced scrollTo", line)) risky.add("forced scrollTo");
    }
  }
  flush();
  console.log(`Conflict Guard v2 scanned ${changedFiles} changed file(s); ${count} warning(s).`);

  if (strict) {
    console.log("Mode: ENFORCING — ownership conflicts block the PR check.");
    if (count > 0) {
      failure(`${count} ownership conflict warning(s) detected. Resolve the duplicate ownership or update the reviewed owner rule before merge.`);
      process.exit(1);
    }
  } else {
    console.log("Mode: WARNING ONLY — set CONFLICT_GUARD_STRICT=1 to enforce failures.");
  }
} catch (error) {
  const message = `Scanner could not complete: ${error instanceof Error ? error.message : String(error)}.`;
  if (strict) {
    failure(`${message} Enforcing mode fails closed.`);
    process.exit(2);
  }
  warning(`${message} Warning-only mode leaves the PR unblocked.`);
}

process.exit(0);
