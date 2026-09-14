import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { digest, owns, StudioError, submissionSchema, targetKey, validateTarget, type Job, type Scope, type Target } from "./schema";

export type Database = { jobs: Record<string, Job>; outbox: string[]; locks: Record<string, { jobId: string; fence: number }>; dispatcherHeartbeatAt?: number };
export interface Store { transaction<T>(action: (db: Database) => T): Promise<T> }

/** Durable single-host development adapter. Never use on Vercel ephemeral disks.
 * A crashed transaction lock requires operator recovery; it is never stolen by TTL.
 * Production requires a transactional shared store implementing this contract.
 */
export class LocalFileStore implements Store {
  constructor(private readonly directory: string) {}
  async transaction<T>(action: (db: Database) => T): Promise<T> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lock = join(this.directory, "transaction.lock");
    try { await mkdir(lock, { mode: 0o700 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new StudioError("STORE_BUSY"); throw error; }
    const file = join(this.directory, "state.json");
    const temp = join(this.directory, `${randomUUID()}.tmp`);
    try {
      let db: Database;
      try { db = JSON.parse(await readFile(file, "utf8")); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new StudioError("STORE_CORRUPT");
        db = { jobs: {}, outbox: [], locks: {} };
      }
      const result = action(db);
      const handle = await open(temp, "wx", 0o600);
      try { await handle.writeFile(JSON.stringify(db)); await handle.sync(); } finally { await handle.close(); }
      await rename(temp, file);
      const directory = await open(this.directory, "r");
      try { await directory.sync(); } finally { await directory.close(); }
      return structuredClone(result);
    } finally { await rm(temp, { force: true }); await rm(lock, { recursive: true }); }
  }
}

export type Submission = { scope: Scope; target: Target; idempotencyKey: string; requestHash: string; orderArtifactId: string };
export async function submit(store: Store, value: Submission) {
  const input = submissionSchema.parse(value);
  validateTarget(input.target);
  if (!input.idempotencyKey || Object.values(input.scope).some(value => !value)) throw new StudioError("INVALID_SUBMISSION");
  const keyHash = digest([input.scope.tenantId, input.scope.projectId, input.idempotencyKey]);
  return store.transaction(db => {
    const existing = Object.values(db.jobs).find(job => job.keyHash === keyHash);
    if (existing) {
      if (!owns(existing.scope, input.scope)) throw new StudioError("ACCESS_DENIED");
      if (existing.requestHash !== input.requestHash || digest(existing.target) !== digest(input.target)) throw new StudioError("IDEMPOTENCY_CONFLICT");
      return existing;
    }
    const job: Job = { schemaVersion: 2, workflowVersion: 1, id: randomUUID(), scope: input.scope, target: input.target,
      keyHash, requestHash: input.requestHash, orderArtifactId: input.orderArtifactId, stage: "design", status: "queued", revision: 0, fence: 0, passed: [], createdAt: Date.now(), deadlineAt: Date.now() + 20 * 60_000 };
    db.jobs[job.id] = job;
    db.outbox.push(job.id); // Job + outbox are one transaction.
    return job;
  });
}
/** Retry storage contention, never external side effects. */
export async function checkpoint<T>(store: Store, action: (db: Database) => T): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await store.transaction(action); }
    catch (error) {
      if (!(error instanceof StudioError) || error.code !== "STORE_BUSY" || attempt >= 7) throw error;
      await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
}
export async function readJob(store: Store, id: string, scope: Scope) {
  return store.transaction(db => {
    const job = db.jobs[id];
    if (!job || !owns(job.scope, scope)) throw new StudioError("ACCESS_DENIED");
    return job;
  });
}
export function releasePublication(db: Database, job: Job) {
  const key = targetKey(job.target);
  if (db.locks[key]?.jobId === job.id && db.locks[key]?.fence === job.fence) delete db.locks[key];
}
