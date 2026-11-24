import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const guardPath = join(scriptDir, "conflict-guard.mjs");
const fixtureRoot = mkdtempSync(join(tmpdir(), "rc-conflict-guard-"));

function git(args) {
  return execFileSync("git", args, { cwd: fixtureRoot, encoding: "utf8" });
}

function commit(message) {
  git(["add", "."]);
  git(["commit", "-m", message]);
}

function runGuard({ strict = true, base = "HEAD^", head = "HEAD" } = {}) {
  const env = {
    ...process.env,
    CONFLICT_GUARD_BASE: base,
    CONFLICT_GUARD_HEAD: head,
  };

  if (strict) {
    env.CONFLICT_GUARD_STRICT = "1";
  } else {
    delete env.CONFLICT_GUARD_STRICT;
  }

  return spawnSync(process.execPath, [guardPath], {
    cwd: fixtureRoot,
    env,
    encoding: "utf8",
  });
}

function expectStatus(result, expected, label) {
  if (result.status !== expected) {
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    throw new Error(`${label}: expected exit ${expected}, got ${String(result.status)}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  }
}

try {
  git(["init"]);
  git(["config", "user.email", "conflict-guard-selftest@royalcommand.invalid"]);
  git(["config", "user.name", "Royal Command CI"]);

  writeFileSync(join(fixtureRoot, "README.md"), "baseline\n");
  commit("baseline");

  mkdirSync(join(fixtureRoot, "docs"), { recursive: true });
  writeFileSync(join(fixtureRoot, "docs", "note.md"), "safe documentation-only change\n");
  commit("safe change");
  expectStatus(runGuard(), 0, "strict clean diff");

  mkdirSync(join(fixtureRoot, "src", "app", "rooms", "[id]"), { recursive: true });
  writeFileSync(
    join(fixtureRoot, "src", "app", "rooms", "[id]", "UnexpectedOwner.tsx"),
    "export function install() { return new MutationObserver(() => {}); }\n",
  );
  commit("synthetic ownership conflict");
  expectStatus(runGuard(), 1, "strict ownership conflict");

  expectStatus(runGuard({ base: "definitely-not-a-ref" }), 2, "strict scanner failure");
  expectStatus(runGuard({ strict: false, base: "definitely-not-a-ref" }), 0, "warning-only scanner failure");

  mkdirSync(join(fixtureRoot, "src", "large"), { recursive: true });
  const large = Array.from({length:60000}, (_,i)=>`export const safe${i} = ${i};`).join("\n")+"\n";
  writeFileSync(join(fixtureRoot, "src", "large", "large.ts"), large);
  commit("safe diff over one MiB");
  expectStatus(runGuard(), 0, "large clean diff streams without ENOBUFS");
  writeFileSync(join(fixtureRoot, "src", "large", "tail.ts"), large+"export const language = 'selected-language';\n");
  commit("conflict at end of large diff");
  expectStatus(runGuard(), 1, "large diff still detects final ownership conflict");

  writeFileSync(join(fixtureRoot, "src", "large", "spoof.ts"), "const text = `\n++ b/public/rc-language-picker.js\nselected-language\n`;\n");
  commit("diff header lookalike inside valid template literal");
  expectStatus(runGuard(), 1, "added content cannot spoof ownership header");
  writeFileSync(join(fixtureRoot, "src", "large", "한글.ts"), "export const label = 'selected-language';\n");
  commit("unicode path still scanned");
  expectStatus(runGuard(), 1, "unicode filename ownership finding, not parse failure");

  // Reviewed adapters do not grant whole-file control privileges.
  const reviewed = JSON.parse(readFileSync(join(scriptDir, "conflict-guard-reviewed-lines.json"), "utf8"));
  for (const [path, checks] of Object.entries(reviewed)) {
    if (path === "scripts/conflict-guard-selftest.mjs") continue;
    const fixture = join(fixtureRoot, path);
    mkdirSync(dirname(fixture), { recursive: true });
    writeFileSync(fixture, [...new Set(Object.values(checks).flat())].join("\n") + "\n");
    commit(`reviewed adapter ${path}`);
    expectStatus(runGuard(), 0, `reviewed exact statements: ${path}`);
    const unreviewed = path.includes("CustomerAISecretary") ? "window.scroll" + "To(0, 0);\n" : path.includes("RoomPreferenceAuthority") ? "const selected" + "Ai = [];\n" : "export const changed = 'selected" + "-language';\n";
    writeFileSync(fixture, unreviewed);
    commit(`unreviewed mutation in ${path}`);
    expectStatus(runGuard(), 1, `same-file unreviewed statements still fail: ${path}`);
  }

  console.log("Conflict Guard self-test passed: clean=0, conflict=1, strict scanner failure=2, warning-only scanner failure=0.");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
