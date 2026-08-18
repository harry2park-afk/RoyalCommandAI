const body = process.env.PR_BODY || "";
const title = process.env.PR_TITLE || "";

function section(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|$)`, "im");
  const match = body.match(re);
  return match ? match[1].trim() : "";
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

if (errors.length) {
  console.error("Royal Command Change Control: FAIL\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Royal Command Change Control: PASS");
console.log(`Ticket: ${issueRefs[0]}`);
console.log(`Primary task: ${primary[0]}`);
console.log(`Batch exception: ${batch.split(/\r?\n/)[0]}`);