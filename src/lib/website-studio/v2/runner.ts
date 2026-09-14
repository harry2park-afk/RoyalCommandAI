import { Sandbox } from "@vercel/sandbox";
import { sourceDigest, StudioError, validatePaths } from "./schema";

export type SourceFile = { path: string; content: string };
export type RunnerConfig = { image: string; projectId: string; teamId: string; templateTreeSha: string; token: () => Promise<string> };
/** A pinned, secret-free image supplies dependencies and /opt/studio/{build,test}.mjs.
 * Models edit src/public files only; neither infrastructure tokens nor host env
 * are copied into the VM. Acceptance remains a separate trusted host verifier.
 */
export async function buildInSandbox(files: SourceFile[], approvedPaths: string[], config: RunnerConfig) {
  validatePaths(files.map(file => file.path), approvedPaths);
  if (!/^[a-f0-9]{40}$/.test(config.templateTreeSha)) throw new StudioError("RUNNER_TEMPLATE_REQUIRED");
  if (!/^[a-zA-Z0-9_./-]+@sha256:[a-f0-9]{64}$/.test(config.image) || !/^prj_[A-Za-z0-9]+$/.test(config.projectId) || !/^team_[A-Za-z0-9]+$/.test(config.teamId)) throw new StudioError("RUNNER_IMAGE_NOT_PINNED");
  if (files.length > 100 || files.reduce((bytes, file) => bytes + Buffer.byteLength(file.content), 0) > 1_000_000) throw new StudioError("RUNNER_INPUT_TOO_LARGE");
  const token = await config.token();
  if (!token) throw new StudioError("RUNNER_NOT_CONNECTED");
  let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | undefined;
  try {
    sandbox = await Sandbox.create({ image: config.image, projectId: config.projectId, teamId: config.teamId, token,
      persistent: false, timeout: 20 * 60_000, networkPolicy: "deny-all", resources: { vcpus: 2 }, env: {} });
    if (config.templateTreeSha) {
      const identity = await sandbox.runCommand({ cmd: "git", args: ["rev-parse", "HEAD^{tree}"], cwd: "/vercel/sandbox", timeoutMs: 5000 });
      const clean = await sandbox.runCommand({ cmd: "git", args: ["status", "--porcelain", "--untracked-files=all"], cwd: "/vercel/sandbox", timeoutMs: 5000 });
      if (identity.exitCode !== 0 || (await identity.stdout()).trim() !== config.templateTreeSha || clean.exitCode !== 0 || (await clean.stdout()).trim()) throw new StudioError("RUNNER_TEMPLATE_MISMATCH");
    }
    await sandbox.writeFiles(files.map(file => ({ path: `/vercel/sandbox/${file.path}`, content: Buffer.from(file.content) })));
    const build = await sandbox.runCommand({ cmd: "node", args: ["/opt/studio/build.mjs"], cwd: "/vercel/sandbox", timeoutMs: 8 * 60_000 });
    if (build.exitCode !== 0) throw new StudioError("RUNNER_BUILD_FAILED");
    const test = await sandbox.runCommand({ cmd: "node", args: ["/opt/studio/test.mjs"], cwd: "/vercel/sandbox", timeoutMs: 8 * 60_000 });
    if (test.exitCode !== 0) throw new StudioError("RUNNER_TEST_FAILED");
    for (const file of files) {
      const after = await sandbox.fs.readFile(`/vercel/sandbox/${file.path}`);
      if (!Buffer.from(after).equals(Buffer.from(file.content))) throw new StudioError("RUNNER_SOURCE_CHANGED");
    }
    // Never return raw stdout/stderr. The input digest is not a Git tree SHA.
    return { sourceDigest: sourceDigest(files), image: config.image, buildExit: 0, testExit: 0, acceptance: "not_checked" as const };
  } catch (error) {
    if (error instanceof StudioError) throw error;
    throw new StudioError("RUNNER_FAILED");
  } finally {
    if (sandbox) {
      try { await sandbox.stop(); } catch { /* Deletion is still required. */ }
      try { await sandbox.delete(); }
      catch { throw new StudioError("RUNNER_CLEANUP_REQUIRED"); }
    }
  }
}
