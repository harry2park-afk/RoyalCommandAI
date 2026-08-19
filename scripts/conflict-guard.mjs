import { execFileSync } from "node:child_process";

const base = process.env.CONFLICT_GUARD_BASE || "HEAD^";
const head = process.env.CONFLICT_GUARD_HEAD || "HEAD";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function warning(message) {
  console.log(`::warning title=Royal Command Conflict Guard::${message}`);
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
  const names = git(["diff", "--name-only", base, head]).trim().split("\n").filter(Boolean);
  const diff = git(["diff", "--unified=0", base, head, "--", "*.js", "*.mjs", "*.ts", "*.tsx"]);
  const sections = diff.split(/^diff --git /m).filter(Boolean);
  let count = 0;

  for (const section of sections) {
    const fileMatch = section.match(/^a\/(.+?) b\/(.+?)\n/);
    if (!fileMatch) continue;
    const file = fileMatch[2];
    const added = section.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++")).join("\n");
    if (!added) continue;

    for (const rule of rules) {
      if (rule.owners.includes(file)) continue;
      if (rule.patterns.some((pattern) => pattern.test(added))) {
        warning(`${rule.name}: ${file} adds direct control of a surface owned by ${rule.owners.join(", ")}. Review for duplicate ownership.`);
        count += 1;
      }
    }

    if (/src\/app\/rooms\/|public\/rc-/.test(file)) {
      const risky = [];
      if (/new\s+MutationObserver/i.test(added)) risky.push("MutationObserver");
      if (/\.appendChild\s*\(/i.test(added)) risky.push("appendChild");
      if (/\.insertBefore\s*\(/i.test(added)) risky.push("insertBefore");
      if (/\.scrollTo\s*\(/i.test(added)) risky.push("forced scrollTo");
      if (risky.length) {
        warning(`${file} adds ${risky.join(", ")}. Confirm this file is the sole owner of the affected DOM/state before merge.`);
        count += 1;
      }
    }
  }

  console.log(`Conflict Guard v1 scanned ${names.length} changed file(s); ${count} warning(s).`);
  console.log("Mode: WARNING ONLY — this check never blocks a merge.");
} catch (error) {
  warning(`Scanner could not complete: ${error instanceof Error ? error.message : String(error)}. Warning-only mode leaves the PR unblocked.`);
}

process.exit(0);
