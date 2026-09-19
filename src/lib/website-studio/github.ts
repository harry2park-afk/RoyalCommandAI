import { BRANCH, REPOSITORY, type WorkState } from "./contract";

export class GithubError extends Error {
  constructor(public status: number) { super(`GITHUB_${status}`); }
}
export async function github<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_NOT_CONNECTED");
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, {
    method: body === undefined ? "GET" : method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new GithubError(response.status);
  return response.json() as Promise<T>;
}
type Ref = { object: { sha: string } };
const LEDGER = "rc-studio/pr748-state";
export type Snapshot = { sha: string; state: WorkState };
export async function head() { return (await github<Ref>(`/git/ref/heads/${encodeURIComponent(BRANCH)}`)).object.sha; }
export async function readState(): Promise<Snapshot | null> {
  let ref: Ref;
  try { ref = await github<Ref>(`/git/ref/${LEDGER}`); }
  catch (error) { if (error instanceof GithubError && error.status === 404) return null; throw error; }
  const commit = await github<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`);
  const tree = await github<{ tree: { path: string; sha: string }[] }>(`/git/trees/${commit.tree.sha}`);
  const entry = tree.tree.find((item) => item.path === "state.json");
  if (!entry) throw new Error("INVALID_WORK_LEDGER");
  const blob = await github<{ content: string }>(`/git/blobs/${entry.sha}`);
  return { sha: ref.object.sha, state: JSON.parse(Buffer.from(blob.content, "base64").toString("utf8")) as WorkState };
}
// Immutable sibling commits + non-force ref update provide atomic CAS. This is
// not a heads/tags ref and cannot publish source or trigger a branch deployment.
// No lease stealing: a crashed owner remains visibly stopped until reconciled.
export async function saveState(previous: Snapshot | null, state: WorkState): Promise<Snapshot> {
  const tree = await github<{ sha: string }>("/git/trees", { tree: [{ path: "state.json", mode: "100644", type: "blob", content: JSON.stringify(state) }] });
  const commit = await github<{ sha: string }>("/git/commits", { message: "Website Studio execution metadata", tree: tree.sha, parents: previous ? [previous.sha] : [] });
  if (previous) await github(`/git/refs/${LEDGER}`, { sha: commit.sha, force: false }, "PATCH");
  else await github("/git/refs", { ref: `refs/${LEDGER}`, sha: commit.sha });
  return { sha: commit.sha, state };
}
