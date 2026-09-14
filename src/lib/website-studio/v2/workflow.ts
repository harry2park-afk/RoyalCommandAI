import { candidateSchema, designSchema, previewSchema, publicationSchema, stages, StudioError, targetKey, validatePaths, type Candidate, type Design, type Job, type Preview, type Publication } from "./schema";
import { checkpoint, releasePublication, type Store } from "./store";

/** Trusted host adapters, never model-supplied callbacks. No raw secrets in Job.
 * Call drain from a durable server consumer, never from a browser stage loop.
 */
export interface Host {
  astra(job: Job): Promise<Design>;
  codex(job: Job): Promise<Candidate>;
  diff(job: Job): Promise<{ treeSha: string; sourceDigest: string; paths: string[] }>;
  publish(job: Job): Promise<Publication>;
  preview(job: Job): Promise<Preview>;
}
export async function runNext(store: Store, jobId: string, host: Host): Promise<Job | undefined> {
  const claimed = await checkpoint(store, db => {
    const job = db.jobs[jobId];
    if (!job || job.status !== "queued") return undefined;
    const index = stages.indexOf(job.stage);
    if (stages.slice(0, index).some(stage => !job.passed.includes(stage))) throw new StudioError("PREDECESSOR_MISSING");
    if (job.stage === "publish") {
      const key = targetKey(job.target);
      if (db.locks[key]) return undefined;
      db.locks[key] = { jobId, fence: job.fence + 1 };
    }
    job.fence += 1; job.revision += 1; job.status = "running";
    db.outbox = db.outbox.filter(id => id !== jobId);
    return job;
  });
  if (!claimed) return undefined;
  const next = structuredClone(claimed);
  try {
    switch (claimed.stage) {
      case "design": {
        next.design = designSchema.parse(await host.astra(structuredClone(claimed)));
        if (next.design.outcome === "accepted") validatePaths(next.design.paths, next.design.paths);
        else {
          if (next.design.outcome === "no_change" && next.design.verifiedSha !== next.target.baseSha) throw new StudioError("NO_CHANGE_SHA_MISMATCH");
          next.outcome = next.design.outcome; next.status = "completed";
        }
        break;
      }
      case "write": {
        if (claimed.design?.outcome !== "accepted") throw new StudioError("DESIGN_NOT_ACCEPTED");
        const candidate = candidateSchema.parse(await host.codex(structuredClone(claimed)));
        validatePaths(candidate.paths, claimed.design.paths);
        if (candidate.acceptanceId !== claimed.design.acceptanceId) throw new StudioError("TEST_EVIDENCE_MISSING");
        next.candidate = candidate;
        break;
      }
      case "diff": {
        const diff = await host.diff(structuredClone(claimed));
        if (diff.treeSha !== claimed.candidate?.treeSha || diff.sourceDigest !== claimed.candidate?.sourceDigest || JSON.stringify([...diff.paths].sort()) !== JSON.stringify([...claimed.candidate.paths].sort())) throw new StudioError("DIFF_MISMATCH");
        break;
      }
      case "publish": {
        const publication = publicationSchema.parse(await host.publish(structuredClone(claimed)));
        if (publication.treeSha !== claimed.candidate?.treeSha) throw new StudioError("PUBLISHED_TREE_MISMATCH");
        next.publication = publication;
        break;
      }
      case "preview": {
        const preview = previewSchema.parse(await host.preview(structuredClone(claimed)));
        const url = new URL(preview.url);
        if (preview.commitSha !== claimed.publication?.commitSha || preview.projectId !== claimed.target.vercelProjectId ||
            preview.acceptanceId !== claimed.candidate?.acceptanceId ||
            url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app") || url.port || url.pathname !== "/" || url.username || url.password || url.search || url.hash) throw new StudioError("PREVIEW_EVIDENCE_MISMATCH");
        next.preview = preview;
        next.outcome = "website_created";
      }
    }
    next.passed.push(claimed.stage);
    const following = stages[stages.indexOf(claimed.stage) + 1];
    if (next.status !== "completed") { next.stage = following ?? claimed.stage; next.status = following ? "queued" : "completed"; }
  } catch {
    // Do not serialize upstream exception strings, URLs, headers, model output.
    next.errorCode = `STUDIO_${claimed.stage.toUpperCase()}_FAILED`;
    next.status = claimed.stage === "publish" ? "reconciling" : "failed";
  }
  return checkpoint(store, db => {
    const current = db.jobs[jobId];
    if (current.status !== "running" || current.revision !== claimed.revision || current.fence !== claimed.fence) throw new StudioError("STALE_WORKER");
    if (claimed.stage === "publish" && next.status !== "reconciling") releasePublication(db, claimed);
    next.revision += 1; db.jobs[jobId] = next;
    if (next.status === "queued") db.outbox.push(jobId);
    return next;
  });
}
export async function drain(store: Store, jobId: string, host: Host) {
  // At most five stages; every stage is checkpointed before the next call.
  for (let step = 0; step < stages.length; step++) {
    const job = await runNext(store, jobId, host);
    if (!job || job.status !== "queued") return job;
  }
}
