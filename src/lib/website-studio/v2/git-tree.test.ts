import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { candidateTree, gitObject } from "./git-tree";
it("complete candidate hash matches real Git, including tree ordering", () => {
  const cwd = mkdtempSync(join(tmpdir(), "studio-tree-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd });
    mkdirSync(join(cwd, "src")); mkdirSync(join(cwd, "src", "core"));
    const files = [{ path: "src/core/a.ts", content: "export const a = 1;\n" }, { path: "src/core.ts", content: "hello\n" }];
    for (const file of files) writeFileSync(join(cwd, file.path), file.content);
    execFileSync("git", ["add", "."], { cwd });
    const expected = execFileSync("git", ["write-tree"], { cwd, encoding: "utf8" }).trim();
    expect(candidateTree([], files)).toBe(expected);
    expect(gitObject("blob", Buffer.from("hello\n"))).toBe(execFileSync("git", ["hash-object", "src/core.ts"], { cwd, encoding: "utf8" }).trim());
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
