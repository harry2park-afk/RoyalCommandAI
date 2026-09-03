import { execFileSync } from "node:child_process";

const body = process.env.PR_BODY || "";
const title = process.env.PR_TITLE || "";
const baseSha = process.env.PR_BASE_SHA || "";
const headSha = process.env.PR_HEAD_SHA || "";

function section(name) {
  const lines = body.split(/\r?\n/);
  const header = `## ${name}`.toLowerCase();
  const start = lines.findIndex((line) => line.trim().toLowerCase() === header);
  if (start < 0) return "";

  const collected = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i].trim())) break;
    collected.push(lines[i]);
  }
  return collected.join("\n").trim();
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function normalizePath(value) {
  return value
    .trim()
    .replace(/^[-*+]\s+/, "")
    .replace(/^`|`$/g, "")
    .replace(/^\.\//, "")
    .trim();
}

function declaredChangedPaths(value) {
  const paths = new Set();
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("<!--")) continue;

    const ticks = [...line.matchAll(/`([^`]+)`/g)].map((match) => normalizePath(match[1]));
    if (ticks.length) {
      for (const candidate of ticks) {
        if (candidate.includes("/") || candidate.startsWith(".")) paths.add(candidate);
      }
      continue;
    }

    const candidate = normalizePath(line);
    if (/^[A-Za-z0-9_.\-[\]()]+(?:\/[A-Za-z0-9_.\-[\]()]+)+$/.test(candidate)) {
      paths.add(candidate);
    }
  }
  return [...paths].sort();
}

const errors = [];
const requiredSections = [
  "Work Queue Ticket",
  "Primary task",
  "Batch exception",
  "Goal",
  "Files / components changed",
  "Locked surfaces touched",
  "Explicit non-goals",
  "Verification plan",
  "Automated checks",
  "Vercel Preview",
  "Rollback point",
];

for (const name of requiredSections) {
  const value = section(name);
  if (!value) errors.push(`Missing or empty section: ## ${name}`);
}

const ticket = section("Work Queue Ticket");
const issueRefs = ticket.match(/#\d+/g) || [];
if (issueRefs.length !== 1) {
  errors.push("Work Queue Ticket must reference exactly one GitHub issue, for example: #90");
}

const primary = section("Primary task")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => !line.startsWith("<!--"));
if (primary.length !== 1) {
  errors.push("Primary task must be exactly one non-empty line.");
}

const batch = section("Batch exception").toUpperCase();
if (!/^NO\b/.test(batch) && !/^YES\b/.test(batch)) {
  errors.push("Batch exception must start with YES or NO.");
}
if (/^YES\b/.test(batch) && batch.replace(/^YES\b/i, "").trim().length < 15) {
  errors.push("Batch exception YES requires a short justification.");
}

const locked = section("Locked surfaces touched");
if (!/\bNONE\b/i.test(locked) && locked.length < 5) {
  errors.push("Locked surfaces touched must say NONE or identify the affected locked surface(s).");
}

const nonGoals = section("Explicit non-goals");
if (nonGoals.length < 10) {
  errors.push("Explicit non-goals must state what this PR deliberately does not change.");
}

const rollback = section("Rollback point");
if (rollback.length < 7) {
  errors.push("Rollback point must identify a stable commit, PR, release, or explicit baseline.");
}

if (/\b(misc|various|multiple unrelated|several unrelated)\b/i.test(title)) {
  errors.push("PR title suggests multiple unrelated tasks. Use one primary task per PR.");
}

const filesSection = section("Files / components changed");
const declaredPaths = declaredChangedPaths(filesSection);
if (declaredPaths.length === 0) {
  errors.push("Files / components changed must declare the repository path of every changed file, preferably in backticks.");
}

if (baseSha && headSha && declaredPaths.length > 0) {
  try {
    const actualPaths = git(["diff", "--name-only", baseSha, headSha])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .sort();

    const declaredSet = new Set(declaredPaths);
    const actualSet = new Set(actualPaths);
    const undeclared = actualPaths.filter((path) => !declaredSet.has(path));
    const declaredButUnchanged = declaredPaths.filter((path) => !actualSet.has(path));

    if (undeclared.length) {
      errors.push(`PR changes undeclared file(s): ${undeclared.join(", ")}. Update ## Files / components changed or remove the unintended diff.`);
    }
    if (declaredButUnchanged.length) {
      errors.push(`PR declares file(s) not present in the diff: ${declaredButUnchanged.join(", ")}. Keep the declared scope exact.`);
    }
  } catch (error) {
    errors.push(`Could not verify declared file scope against the PR diff: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (errors.length) {
  console.error("Royal Command Change Control: FAIL\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Royal Command Change Control: PASS");
console.log(`Ticket: ${issueRefs[0]}`);
console.log(`Primary task: ${primary[0]}`);
console.log(`Batch exception: ${batch.split(/\r?\n/)[0]}`);
console.log(`Declared files: ${declaredPaths.join(", ")}`);
