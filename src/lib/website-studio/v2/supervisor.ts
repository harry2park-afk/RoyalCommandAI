import { sleep, RetryableError } from "workflow";

async function deliver() {
  "use step";
  try {
    const { runtimeData } = await import("./runtime-data");
    const { checkpoint } = await import("./store");
    const { dispatchOutbox } = await import("./dispatch");
    const { reconcilePublication } = await import("./recovery");
    const { inspectPublication } = await import("./host");
    const data = runtimeData();
    await checkpoint(data.store, db => {
      for (const job of Object.values(db.jobs)) {
        if (!job.deadlineAt || job.deadlineAt > Date.now() || ["completed", "failed", "reconciling"].includes(job.status)) continue;
        // An in-flight publication keeps its lock until a verified receipt exists.
        job.status = job.stage === "publish" && job.status === "running" ? "reconciling" : "failed";
        job.errorCode = "JOB_DEADLINE_EXCEEDED"; job.revision++;
        db.outbox = db.outbox.filter(id => id !== job.id);
      }
      db.dispatcherHeartbeatAt = Date.now();
    });
    const pending = await checkpoint(data.store, db => Object.values(db.jobs).filter(job => job.status === "reconciling" && job.stage === "publish").slice(0, 20).map(job => job.id));
    for (const id of pending) {
      try { await reconcilePublication(data.store, id, job => inspectPublication(data, job)); }
      catch { /* Keep unresolved publication locked; do not retry mutation. */ }
    }
    await dispatchOutbox(data.store);
    return "delivered";
  } catch { throw new RetryableError("STUDIO_DISPATCHER_UNAVAILABLE", { retryAfter: "1m" }); }
}
/** Start once in the trusted test executor before enabling job intake.
 * Multiple supervisors are harmless: DB claims serialize all external stages.
 */
export async function studioSupervisorWorkflow() {
  "use workflow";
  while (true) { await deliver(); await sleep("1m"); }
}
