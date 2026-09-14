import { sha, sourceDigest, StudioError, validatePaths, validateTarget, type Job, type Publication } from "./schema";

export type Addition = { path: string; contents: string };
/** The token supplier must be a scoped central publisher, outside the runner.
 * No automatic retries. Any error after send is reconciled by the workflow.
 */
export async function publishCandidate(job: Job, additions: Addition[], token: () => Promise<string>, request: typeof fetch = fetch): Promise<Publication> {
  validateTarget(job.target);
  if (job.stage !== "publish" || job.status !== "running" || job.design?.outcome !== "accepted" || !job.candidate || !job.passed.includes("diff")) throw new StudioError("PUBLICATION_NOT_READY");
  validatePaths(additions.map(file => file.path), job.candidate.paths);
  if (additions.length !== job.candidate.paths.length || additions.length > 100 || additions.reduce((total, file) => total + file.contents.length, 0) > 1_000_000) throw new StudioError("PUBLICATION_SIZE_UNSUPPORTED");
  if (additions.some(file => !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.contents))) throw new StudioError("INVALID_CONTENT_ENCODING");
  const sources = additions.map(file => {
    const bytes = Buffer.from(file.contents, "base64"), content = bytes.toString("utf8");
    if (!Buffer.from(content).equals(bytes)) throw new StudioError("INVALID_CONTENT_ENCODING");
    return { path: file.path, content };
  });
  if (sourceDigest(sources) !== job.candidate.sourceDigest) throw new StudioError("UNTESTED_PUBLICATION_CONTENT");
  const secret = await token();
  if (!secret) throw new StudioError("PUBLISHER_NOT_CONNECTED");
  try {
    const response = await request("https://api.github.com/graphql", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid tree{oid}}}}",
        variables: { input: { branch: { repositoryNameWithOwner: job.target.repository, branchName: job.target.branch },
          expectedHeadOid: job.target.baseSha, message: { headline: `Website Studio ${job.id}` },
          fileChanges: { additions } } },
      }),
    });
    if (!response.ok) throw new StudioError("PUBLICATION_UNCERTAIN");
    const result = await response.json();
    if (result.errors?.length) throw new StudioError("PUBLICATION_UNCERTAIN");
    const commit = result.data?.createCommitOnBranch?.commit;
    const commitSha = sha.parse(commit?.oid);
    const treeSha = sha.parse(commit?.tree?.oid);
    if (treeSha !== job.candidate.treeSha) throw new StudioError("PUBLICATION_UNCERTAIN");
    return { commitSha, treeSha };
  } catch { throw new StudioError("PUBLICATION_UNCERTAIN"); }
}
