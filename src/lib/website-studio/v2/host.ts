import { z } from "zod";
import { getVercelOidcToken } from "@vercel/functions/oidc";
import { candidateTree, type GitEntry } from "./git-tree";
import { designWithAstra, writeWithCodex } from "./model";
import { buildInSandbox } from "./runner";
import { publishCandidate } from "./publication";
import { verifyCalculator } from "./browser-acceptance";
import { sourceDigest, StudioError, validatePaths, type Job } from "./schema";
import type { Host } from "./workflow";
import type { RuntimeData, TestProject } from "./runtime-data";

const filesSchema = z.array(z.object({ path: z.string(), content: z.string() }));
function credential(name: string) { const value = process.env[name]; if (!value) throw new StudioError(`${name}_REQUIRED`); return value; }
async function github<T>(project: TestProject, path: string): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${project.target.repository}${path}`, {
    redirect: "error", signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${credential("GITHUB_TOKEN")}`, Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new StudioError("GITHUB_READ_FAILED");
  return response.json();
}
async function baseline(project: TestProject) {
  const identity = await github<{ id: number; full_name: string }>(project, "");
  if (String(identity.id) !== project.target.repositoryId || identity.full_name.toLowerCase() !== project.target.repository.toLowerCase() || identity.id === 1314345897) throw new StudioError("REPOSITORY_IDENTITY_MISMATCH");
  const commit = await github<{ tree: { sha: string } }>(project, `/git/commits/${project.target.baseSha}`);
  if (commit.tree.sha !== project.templateTreeSha) throw new StudioError("TEMPLATE_VERSION_MISMATCH");
  const tree = await github<{ truncated: boolean; tree: GitEntry[] }>(project, `/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated || candidateTree(tree.tree, []) !== commit.tree.sha) throw new StudioError("BASE_TREE_INCOMPLETE");
  const sources: { path: string; content: string }[] = [];
  for (const path of project.allowedPaths) {
    const entry = tree.tree.find(entry => entry.path === path);
    if (!entry) continue;
    if (entry.type !== "blob" || entry.mode !== "100644") throw new StudioError("UNSAFE_BASE_FILE");
    const blob = await github<{ content: string; encoding: string }>(project, `/git/blobs/${entry.sha}`);
    if (blob.encoding !== "base64") throw new StudioError("UNSUPPORTED_BLOB");
    sources.push({ path, content: Buffer.from(blob.content, "base64").toString("utf8") });
  }
  return { tree: tree.tree, sources };
}
export function createHost(data: RuntimeData): Host {
  return {
    async astra(job) {
      const project = await data.assertJob(job), base = await baseline(project);
      const order = z.string().min(1).max(12000).parse(await data.get(job.scope, job.orderArtifactId));
      const design = await designWithAstra(order, base.sources, project.allowedPaths);
      if (design.outcome === "accepted") validatePaths(design.paths, project.allowedPaths);
      const artifactId = await data.put(job.scope, design);
      return design.outcome === "accepted" ? { outcome: "accepted", artifactId, paths: design.paths, acceptanceId: project.acceptanceId }
        : { outcome: design.outcome, artifactId };
    },
    async codex(job) {
      const project = await data.assertJob(job), base = await baseline(project);
      if (job.design?.outcome !== "accepted") throw new StudioError("DESIGN_NOT_ACCEPTED");
      const design = await data.get(job.scope, job.design.artifactId);
      const order = z.string().parse(await data.get(job.scope, job.orderArtifactId));
      const proposed = await writeWithCodex(order, design, base.sources);
      if (proposed.files.length) validatePaths(proposed.files.map(file => file.path), job.design.paths);
      const changed = proposed.files.filter(file => base.sources.find(source => source.path === file.path)?.content !== file.content);
      if (!changed.length) {
        const existing = await createHost(data).preview({ ...job, publication: { commitSha: job.target.baseSha, treeSha: project.templateTreeSha } });
        return { outcome: "no_change", verifiedSha: job.target.baseSha, evidenceId: existing.evidenceId };
      }
      const sources = new Map(base.sources.map(file => [file.path, file]));
      for (const file of changed) sources.set(file.path, file);
      const sandboxProject = credential("VERCEL_PROJECT_ID"), sandboxTeam = credential("VERCEL_ORG_ID");
      if (sandboxTeam !== project.teamId) throw new StudioError("SANDBOX_TEAM_MISMATCH");
      const runner = await buildInSandbox([...sources.values()], project.allowedPaths, { image: project.image,
        projectId: sandboxProject, templateTreeSha: project.templateTreeSha,
        teamId: sandboxTeam, token: async () => process.env.VERCEL_TOKEN || getVercelOidcToken() });
      const evidenceId = await data.put(job.scope, { ...runner, baseSha: job.target.baseSha, templateTreeSha: project.templateTreeSha });
      return { artifactId: await data.put(job.scope, changed), treeSha: candidateTree(base.tree, changed), sourceDigest: sourceDigest(changed),
        buildEvidenceId: evidenceId, testEvidenceId: evidenceId, acceptanceId: project.acceptanceId, paths: changed.map(file => file.path) };
    },
    async diff(job) {
      const project = await data.assertJob(job), base = await baseline(project);
      if (!job.candidate) throw new StudioError("CANDIDATE_REQUIRED");
      const files = filesSchema.parse(await data.get(job.scope, job.candidate.artifactId));
      validatePaths(files.map(file => file.path), project.allowedPaths);
      const evidence = z.object({ sourceDigest: z.string(), buildExit: z.literal(0), testExit: z.literal(0), baseSha: z.string(), templateTreeSha: z.string(), image: z.string() }).parse(await data.get(job.scope, job.candidate.buildEvidenceId));
      const sources = new Map(base.sources.map(file => [file.path, file])); for (const file of files) sources.set(file.path, file);
      if (evidence.sourceDigest !== sourceDigest([...sources.values()]) || evidence.baseSha !== job.target.baseSha || evidence.templateTreeSha !== project.templateTreeSha || evidence.image !== project.image) throw new StudioError("BUILD_EVIDENCE_MISMATCH");
      const head = await github<{ object: { sha: string } }>(project, `/git/ref/heads/${project.target.branch}`);
      if (head.object.sha !== project.target.baseSha) throw new StudioError("BASE_SHA_CHANGED");
      return { treeSha: candidateTree(base.tree, files), sourceDigest: sourceDigest(files), paths: files.map(file => file.path) };
    },
    async publish(job) {
      await baseline(await data.assertJob(job));
      if (!job.candidate) throw new StudioError("CANDIDATE_REQUIRED");
      const files = filesSchema.parse(await data.get(job.scope, job.candidate.artifactId));
      return publishCandidate(job, files.map(file => ({ path: file.path, contents: Buffer.from(file.content).toString("base64") })), async () => credential("GITHUB_TOKEN"));
    },
    async preview(job: Job) {
      const project = await data.assertJob(job);
      if (!job.publication) throw new StudioError("PUBLICATION_REQUIRED");
      const linked = await fetch(`https://api.vercel.com/v9/projects/${project.target.vercelProjectId}?teamId=${project.teamId}`, {
        redirect: "error", signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${credential("VERCEL_TOKEN")}` } });
      if (!linked.ok) throw new StudioError("VERCEL_PROJECT_UNAVAILABLE");
      const metadata = await linked.json();
      if (metadata.id !== project.target.vercelProjectId || String(metadata.link?.repoId) !== project.target.repositoryId) throw new StudioError("VERCEL_REPOSITORY_MISMATCH");
      const response = await fetch(`https://api.vercel.com/v6/deployments?projectId=${project.target.vercelProjectId}&teamId=${project.teamId}&sha=${job.publication.commitSha}&target=preview`, {
        redirect: "error", signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${credential("VERCEL_TOKEN")}` } });
      if (!response.ok) throw new StudioError("VERCEL_METADATA_UNAVAILABLE");
      const payload = await response.json();
      const match = z.array(z.object({ uid: z.string(), url: z.string(), readyState: z.string().optional(), state: z.string().optional(), target: z.string().nullable().optional(), meta: z.record(z.string(), z.unknown()) }))
        .parse(payload.deployments).find(deployment => deployment.meta.githubCommitSha === job.publication!.commitSha && deployment.target !== "production" && (deployment.readyState || deployment.state) === "READY");
      if (!match) throw new StudioError("SAME_SHA_PREVIEW_NOT_READY");
      const deployment = { id: match.uid, projectId: project.target.vercelProjectId, sha: job.publication.commitSha, url: `https://${match.url}`, ready: true, target: "preview" as const };
      const checks = await verifyCalculator(deployment, { projectId: deployment.projectId, sha: deployment.sha }, async () => credential("STUDIO_TEST_AUTOMATION_BYPASS_SECRET"));
      return { deploymentId: deployment.id, projectId: deployment.projectId, commitSha: deployment.sha, url: deployment.url, acceptanceId: project.acceptanceId, evidenceId: await data.put(job.scope, checks) };
    },
  };
}
export async function inspectPublication(data: RuntimeData, job: Job) {
  const project = await data.assertJob(job);
  await baseline(project);
  const head = await github<{ object: { sha: string } }>(project, `/git/ref/heads/${project.target.branch}`);
  if (head.object.sha === job.target.baseSha) return undefined;
  const commit = await github<{ sha: string; message: string; tree: { sha: string }; parents: { sha: string }[] }>(project, `/git/commits/${head.object.sha}`);
  if (commit.message.split("\n")[0] !== `Website Studio ${job.id}` || commit.parents.length !== 1) return undefined;
  return { commitSha: commit.sha, headSha: head.object.sha, treeSha: commit.tree.sha, parentSha: commit.parents[0].sha, operationId: job.id };
}
