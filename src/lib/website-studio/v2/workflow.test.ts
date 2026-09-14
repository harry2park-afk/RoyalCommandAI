import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { digest, StudioError, targetKey } from "./schema";
import { checkpoint, LocalFileStore, readJob, submit, type Store } from "./store";
import { drain, runNext, type Host } from "./workflow";
import { reconcilePublication } from "./recovery";

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "studio-v2-test-")); dirs.push(directory);
  const store = new LocalFileStore(directory);
  const input = { scope: { tenantId: randomUUID(), projectId: randomUUID(), actorId: randomUUID(), roomId: randomUUID() },
    target: { repositoryId: "42", repository: "test/site", branch: "studio-work/test", baseSha: "a".repeat(40), vercelProjectId: "prj_test" },
    idempotencyKey: randomUUID(), requestHash: digest("build calculator"), orderArtifactId: randomUUID() };
  const job = await submit(store, input);
  const acceptanceId = randomUUID();
  // Deliberately mocked providers and remote services. File persistence is real.
  const host: Host = {
    astra: vi.fn(async () => ({ outcome: "accepted" as const, artifactId: randomUUID(), paths: ["src/app.ts"], acceptanceId })),
    codex: vi.fn(async () => ({ artifactId: randomUUID(), treeSha: "b".repeat(40), sourceDigest: "d".repeat(64), paths: ["src/app.ts"], acceptanceId, buildEvidenceId: randomUUID(), testEvidenceId: randomUUID() })),
    diff: vi.fn(async () => ({ treeSha: "b".repeat(40), sourceDigest: "d".repeat(64), paths: ["src/app.ts"] })),
    publish: vi.fn(async () => ({ commitSha: "c".repeat(40), treeSha: "b".repeat(40) })),
    preview: vi.fn(async () => ({ deploymentId: "dpl_test", projectId: "prj_test", commitSha: "c".repeat(40), url: "https://immutable-test.vercel.app", acceptanceId, evidenceId: randomUUID() })),
  };
  return { store, directory, input, job, host };
}
describe("server execution with real local persistence / mocked external stages", () => {
  it("persists one order across store recreation and consumes every stage once", async () => {
    const f = await fixture();
    expect((await submit(f.store, f.input)).id).toBe(f.job.id);
    await runNext(f.store, f.job.id, f.host);
    const reopened = new LocalFileStore(f.directory);
    const result = await drain(reopened, f.job.id, f.host);
    expect(result?.outcome).toBe("website_created");
    expect(result?.passed).toEqual(["design", "write", "diff", "publish", "preview"]);
    await drain(reopened, f.job.id, f.host);
    for (const call of Object.values(f.host)) expect(call).toHaveBeenCalledTimes(1);
    expect(await reopened.transaction(db => db.outbox)).toEqual([]);
  });
  it("rejects conflicting replay and cross-tenant reads", async () => {
    const f = await fixture();
    await expect(submit(f.store, { ...f.input, requestHash: digest("different") })).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    await expect(readJob(f.store, f.job.id, { ...f.input.scope, tenantId: randomUUID() })).rejects.toThrow("ACCESS_DENIED");
    expect((await submit(f.store, { ...f.input, scope: { ...f.input.scope, projectId: randomUUID() } })).id).not.toBe(f.job.id);
  });
  it("duplicate workers never call the same stage twice", async () => {
    const f = await fixture();
    let release!: () => void;
    f.host.astra = vi.fn(async () => { await new Promise<void>(resolve => { release = resolve; }); return { outcome: "design_only" as const, artifactId: randomUUID() }; });
    const first = runNext(f.store, f.job.id, f.host);
    await vi.waitFor(() => expect(f.host.astra).toHaveBeenCalledTimes(1));
    expect(await runNext(f.store, f.job.id, f.host)).toBeUndefined();
    release(); await first;
  });
  it.each(["astra", "codex", "diff", "publish", "preview"] as const)("stops on %s failure and removes raw errors", async failing => {
    const f = await fixture();
    f.host[failing] = vi.fn(async () => { throw new Error("SECRET_CANARY_https://private.invalid/?token=never-store"); });
    const result = await drain(f.store, f.job.id, f.host);
    expect(result?.status).toBe(failing === "publish" ? "reconciling" : "failed");
    const names = ["astra", "codex", "diff", "publish", "preview"] as const;
    for (const name of names.slice(names.indexOf(failing) + 1)) expect(f.host[name]).not.toHaveBeenCalled();
    expect(await readFile(join(f.directory, "state.json"), "utf8")).not.toContain("SECRET_CANARY");
    if (failing === "publish") expect(await f.store.transaction(db => db.locks[targetKey(f.job.target)]?.jobId)).toBe(f.job.id);
  });
  it.each(["design_only", "unsupported", "no_change"] as const)("terminates %s without write or publication", async outcome => {
    const f = await fixture();
    f.host.astra = vi.fn(async () => outcome === "no_change"
      ? { outcome, artifactId: randomUUID(), verifiedSha: f.job.target.baseSha, evidenceId: randomUUID() }
      : { outcome, artifactId: randomUUID() });
    expect((await drain(f.store, f.job.id, f.host))?.outcome).toBe(outcome);
    expect(f.host.codex).not.toHaveBeenCalled(); expect(f.host.publish).not.toHaveBeenCalled();
  });
  it("strips unexpected provider fields before persisting", async () => {
    const f = await fixture(); const original = f.host.codex;
    f.host.codex = async job => ({ ...await original(job), token: "SECRET_CANARY" });
    await drain(f.store, f.job.id, f.host);
    expect(await readFile(join(f.directory, "state.json"), "utf8")).not.toContain("SECRET_CANARY");
  });
  it("retries a busy checkpoint without repeating host execution", async () => {
    const f = await fixture(); let busy = false;
    const original = f.host.astra;
    f.host.astra = vi.fn(async job => { const result = await original(job); busy = true; return result; });
    const store: Store = { transaction: async action => { if (busy) { busy = false; throw new StudioError("STORE_BUSY"); } return f.store.transaction(action); } };
    expect((await runNext(store, f.job.id, f.host))?.stage).toBe("write");
    expect(f.host.astra).toHaveBeenCalledTimes(1);
  });
  it("rejects stale workers at checkpoint", async () => {
    const f = await fixture(); const original = f.host.astra;
    f.host.astra = async job => { await checkpoint(f.store, db => { db.jobs[job.id].fence++; }); return original(job); };
    await expect(runNext(f.store, f.job.id, f.host)).rejects.toThrow("STALE_WORKER");
    expect(f.host.codex).not.toHaveBeenCalled();
  });
  it("holds a global branch lock across tenants after uncertain publication", async () => {
    const f = await fixture(); f.host.publish = vi.fn(async () => { throw new Error("lost response"); });
    await drain(f.store, f.job.id, f.host);
    const second = await submit(f.store, { ...f.input, scope: { ...f.input.scope, tenantId: randomUUID() } });
    await drain(f.store, second.id, f.host);
    expect(f.host.publish).toHaveBeenCalledTimes(1);
    expect((await readJob(f.store, second.id, second.scope)).stage).toBe("publish");
  });
  it("rejects deployment SHA mismatch without saving its response", async () => {
    const f = await fixture(); const original = f.host.preview;
    f.host.preview = async job => ({ ...await original(job), commitSha: "d".repeat(40) });
    const result = await drain(f.store, f.job.id, f.host);
    expect(result?.status).toBe("failed"); expect(result?.preview).toBeUndefined();
  });
  it("reconciles a lost publish response without publishing again", async () => {
    const f = await fixture(); f.host.publish = vi.fn(async () => { throw new Error("lost response"); });
    await drain(f.store, f.job.id, f.host);
    expect(await reconcilePublication(f.store, f.job.id, async () => undefined)).toBeUndefined();
    const receipt = { commitSha: "c".repeat(40), headSha: "c".repeat(40), treeSha: "b".repeat(40), parentSha: f.job.target.baseSha, operationId: f.job.id };
    expect(await reconcilePublication(f.store, f.job.id, async () => ({ ...receipt, parentSha: "f".repeat(40) }))).toBeUndefined();
    expect((await reconcilePublication(f.store, f.job.id, async () => receipt))?.stage).toBe("preview");
    expect((await drain(f.store, f.job.id, f.host))?.outcome).toBe("website_created");
    expect(f.host.publish).toHaveBeenCalledTimes(1);
  });
});
