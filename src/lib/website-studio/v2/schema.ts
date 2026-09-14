import { createHash } from "node:crypto";
import { z } from "zod";

export const sha = z.string().regex(/^[a-f0-9]{40}$/);
export const hash = z.string().regex(/^[a-f0-9]{64}$/);
const ref = z.string().uuid();
export const designSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("accepted"), artifactId: ref, paths: z.array(z.string()).min(1), acceptanceId: ref }),
  z.object({ outcome: z.literal("design_only"), artifactId: ref }),
  z.object({ outcome: z.literal("no_change"), artifactId: ref, verifiedSha: sha, evidenceId: ref }),
  z.object({ outcome: z.literal("unsupported"), artifactId: ref }),
]);
export const stages = ["design", "write", "diff", "publish", "preview"] as const;
export type Stage = typeof stages[number];
export type Scope = { tenantId: string; projectId: string; actorId: string; roomId: string };
export type Target = { repositoryId: string; repository: string; branch: string; baseSha: string; vercelProjectId: string };
export type Design = z.infer<typeof designSchema>;
export type Candidate = { artifactId: string; treeSha: string; sourceDigest: string; buildEvidenceId: string; testEvidenceId: string; acceptanceId: string; paths: string[] };
export type Publication = { commitSha: string; treeSha: string };
export type Preview = { deploymentId: string; projectId: string; commitSha: string; url: string; acceptanceId: string; evidenceId: string };
export const candidateSchema = z.object({ artifactId: ref, treeSha: sha, sourceDigest: hash, buildEvidenceId: ref, testEvidenceId: ref, acceptanceId: ref, paths: z.array(z.string()).min(1) });
export const publicationSchema = z.object({ commitSha: sha, treeSha: sha });
export const previewSchema = z.object({ deploymentId: z.string().regex(/^dpl_[A-Za-z0-9]+$/), projectId: z.string().regex(/^prj_[A-Za-z0-9]+$/), commitSha: sha,
  url: z.string().url(), acceptanceId: ref, evidenceId: ref });
export const scopeSchema = z.object({ tenantId: ref, projectId: ref, actorId: ref, roomId: ref });
export const targetSchema = z.object({ repositoryId: z.string().regex(/^\d+$/), repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  branch: z.string().regex(/^studio-work\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/), baseSha: sha, vercelProjectId: z.string().regex(/^prj_[A-Za-z0-9]+$/) });
export const submissionSchema = z.object({ scope: scopeSchema, target: targetSchema, idempotencyKey: z.string().min(1).max(200), requestHash: hash, orderArtifactId: ref });
export type Job = {
  schemaVersion: 2; workflowVersion: 1; id: string; scope: Scope; target: Target;
  requestHash: string; keyHash: string; orderArtifactId: string;
  stage: Stage; status: "queued" | "running" | "completed" | "failed" | "reconciling";
  revision: number; fence: number; passed: Stage[]; outcome?: Design["outcome"] | "website_created";
  design?: Design; candidate?: Candidate; publication?: Publication; preview?: Preview;
  errorCode?: string;
};
export class StudioError extends Error {
  constructor(public readonly code: string) { super(code); }
}
export function digest(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
export function sourceDigest(files: { path: string; content: string }[]) {
  return digest(files.map(({ path, content }) => ({ path, content })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
export function owns(a: Scope, b: Scope) { return a.tenantId === b.tenantId && a.projectId === b.projectId && a.actorId === b.actorId && a.roomId === b.roomId; }
export function targetKey(target: Target) { return digest([target.repositoryId, target.branch]); }
export function validateTarget(target: Target) {
  sha.parse(target.baseSha);
  if (!/^\d+$/.test(target.repositoryId) || !/^[\w.-]+\/[\w.-]+$/.test(target.repository) ||
      !/^studio-work\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(target.branch) || !target.vercelProjectId.startsWith("prj_")) {
    throw new StudioError("TARGET_NOT_APPROVED");
  }
}
export function validatePaths(paths: string[], approved: string[]) {
  if (!paths.length || new Set(paths).size !== paths.length || paths.some(path =>
    !approved.includes(path) || !/^(src|public)\/[a-zA-Z0-9_./-]+$/.test(path) ||
    path.split("/").some(segment => !segment || segment.startsWith(".")) ||
    /(^|\/)(middleware|instrumentation)\./.test(path))) throw new StudioError("UNSAFE_CANDIDATE_PATHS");
}
