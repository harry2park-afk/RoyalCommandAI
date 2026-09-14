import { FatalError, getWorkflowMetadata, sleep } from "workflow";
import type { Stage } from "./schema";

export async function executeStage(jobId: string, expectedStage: Stage) {
  "use step";
  try {
    const { runtimeData } = await import("./runtime-data");
    const { createHost } = await import("./host");
    const { checkpoint } = await import("./store");
    const { runNext } = await import("./workflow");
    const data = runtimeData();
    const runId = getWorkflowMetadata().workflowRunId;
    const before = await checkpoint(data.store, db => {
      const job = db.jobs[jobId];
      if (!job || (job.workflowRunId && job.workflowRunId !== runId)) return undefined;
      job.workflowRunId = runId;
      return job;
    });
    if (!before) return "blocked";
    await data.assertJob(before);
    if (before.passed.includes(expectedStage)) return before.status === "completed" ? "completed" : "advance";
    if (before.status === "completed") return "completed";
    if (before.stage !== expectedStage || before.status !== "queued") return "blocked";
    const after = await runNext(data.store, jobId, createHost(data));
    if (!after) return expectedStage === "publish" ? "waiting_lock" : "blocked";
    if (after.status === "completed") return "completed";
    if (after.stage === "preview" && after.status === "queued" && after.errorCode === "SAME_SHA_PREVIEW_NOT_READY") return "waiting_preview";
    return after.status === "queued" ? "advance" : "blocked";
  } catch { throw new FatalError("STUDIO_STEP_BLOCKED"); }
}
executeStage.maxRetries = 0; // Never replay model/publication calls blindly.

/** Only job ID and safe codes are recorded in Workflow inputs/results. */
export async function websiteStudioWorkflow(jobId: string) {
  "use workflow";
  const stages: Stage[] = ["design", "write", "diff", "publish", "preview"];
  for (const stage of stages) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const result = await executeStage(jobId, stage);
      if (result === "waiting_preview" || result === "waiting_lock") {
        if (attempt === 59) { await expireWaiting(jobId, stage); return { jobId, result: "wait_exhausted" }; }
        await sleep("10s"); continue;
      }
      if (result !== "advance") return { jobId, result };
      break;
    }
  }
  return { jobId, result: "preview_wait_exhausted" };
}
async function expireWaiting(jobId: string, expectedStage: Stage) {
  "use step";
  try {
    const { runtimeData } = await import("./runtime-data");
    const { checkpoint } = await import("./store");
    await checkpoint(runtimeData().store, db => {
      const job = db.jobs[jobId];
      if (job?.stage === expectedStage && job.status === "queued") {
        job.status = "failed"; job.errorCode = "STAGE_WAIT_DEADLINE_EXCEEDED"; job.revision++;
        db.outbox = db.outbox.filter(id => id !== jobId);
      }
    });
  } catch { throw new FatalError("STUDIO_TIMEOUT_CHECKPOINT_FAILED"); }
}

async function connectionCheckpoint(sequence: number) {
  "use step";
  return { sequence, checkpointed: true };
}
/** Zero customer data, no AI, no DB, no source/secret input. */
export async function studioConnectionWorkflow() {
  "use workflow";
  const first = await connectionCheckpoint(1);
  await sleep("1s");
  const second = await connectionCheckpoint(2);
  return { first: first.sequence, second: second.sequence, resumed: true };
}
