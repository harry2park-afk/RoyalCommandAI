import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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

  console.log("Conflict Guard self-test passed: clean=0, conflict=1, strict scanner failure=2, warning-only scanner failure=0.");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
