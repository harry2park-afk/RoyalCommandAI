import { publicationSchema, StudioError, targetKey, type Job } from "./schema";
import { checkpoint, releasePublication, type Store } from "./store";

export type RemoteReceipt = { commitSha: string; treeSha: string; parentSha: string; headSha: string; operationId: string };
/** Trusted read-only GitHub lookup, not a model receipt. Absence is not proof
 * of non-publication: a request may still be in flight, so retain the lock.
 * Also handles process exit after send but before the publish checkpoint.
 */
export async function reconcilePublication(store: Store, id: string, inspect: (job: Job) => Promise<RemoteReceipt | undefined>) {
  const before = await checkpoint(store, db => {
    const job = db.jobs[id];
    if (!job || job.stage !== "publish" || !["running", "reconciling"].includes(job.status)) throw new StudioError("RECONCILIATION_NOT_READY");
    return job;
  });
  let receipt: RemoteReceipt | undefined;
  try { receipt = await inspect(before); } catch { throw new StudioError("RECONCILIATION_UNAVAILABLE"); }
  if (!receipt || receipt.operationId !== id || receipt.parentSha !== before.target.baseSha || receipt.treeSha !== before.candidate?.treeSha || receipt.headSha !== receipt.commitSha) return undefined;
  const publication = publicationSchema.parse(receipt);
  return checkpoint(store, db => {
    const job = db.jobs[id];
    const lock = db.locks[targetKey(job.target)];
    if (job.revision !== before.revision || job.fence !== before.fence || lock?.jobId !== id || lock.fence !== before.fence) throw new StudioError("STALE_WORKER");
    releasePublication(db, job);
    job.publication = publication; job.stage = "preview"; job.status = "queued";
    job.passed.push("publish"); job.revision++; job.fence++; delete job.errorCode;
    delete job.workflowRunId;
    if (job.deadlineAt && job.deadlineAt <= Date.now()) {
      job.status = "failed"; job.errorCode = "PUBLICATION_CONFIRMED_AFTER_DEADLINE";
      db.outbox = db.outbox.filter(value => value !== id);
    } else if (!db.outbox.includes(id)) db.outbox.push(id);
    return job;
  });
}
