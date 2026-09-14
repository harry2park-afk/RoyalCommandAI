import { start } from "workflow/api";
import { websiteStudioWorkflow } from "./durable";
import { studioSupervisorWorkflow } from "./supervisor";
import { checkpoint, type Store } from "./store";

/** Trusted bootstrap only; never called by public job intake. */
export async function startStudioSupervisor() { return start(studioSupervisorWorkflow, []); }

/** Start can be delivered more than once; stage claims remain authoritative.
 * Keep the outbox entry until its first stage claims it, even after start fails.
 */
export async function dispatchOutbox(store: Store) {
  const ids = await checkpoint(store, db => db.outbox.filter(id => db.jobs[id]?.status === "queued" && !db.jobs[id]?.workflowRunId).slice(0, 20));
  const dispatched: string[] = [];
  for (const id of ids) {
    try { await start(websiteStudioWorkflow, [id]); dispatched.push(id); }
    catch { /* Outbox remains durable for the next delivery. */ }
  }
  return { dispatched };
}
