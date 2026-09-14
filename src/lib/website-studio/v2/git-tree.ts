import { createHash } from "node:crypto";
import { StudioError } from "./schema";
export type GitEntry = { path: string; mode: string; type: string; sha: string };
export function gitObject(type: "blob" | "tree", data: Buffer) {
  return createHash("sha1").update(Buffer.from(`${type} ${data.length}\0`)).update(data).digest("hex");
}
/** Reconstruct the complete tree locally. No GitHub mutation during build/diff. */
export function candidateTree(entries: GitEntry[], files: { path: string; content: string }[]) {
  const leaves = new Map(entries.filter(entry => entry.type !== "tree").map(entry => [entry.path, { ...entry }]));
  for (const file of files) leaves.set(file.path, { path: file.path, mode: "100644", type: "blob", sha: gitObject("blob", Buffer.from(file.content)) });
  type Node = { leaves: Map<string, GitEntry>; directories: Map<string, Node> };
  const node = (): Node => ({ leaves: new Map(), directories: new Map() });
  const root = node();
  for (const entry of leaves.values()) {
    if (!/^[a-f0-9]{40}$/.test(entry.sha) || !["100644", "100755", "120000", "160000"].includes(entry.mode)) throw new StudioError("UNSUPPORTED_GIT_TREE");
    const parts = entry.path.split("/");
    if (parts.some(part => !part || part === "." || part === ".." || part.includes("\0"))) throw new StudioError("UNSAFE_GIT_TREE");
    let current = root;
    for (const part of parts.slice(0, -1)) {
      if (!current.directories.has(part)) current.directories.set(part, node());
      current = current.directories.get(part)!;
    }
    current.leaves.set(parts.at(-1)!, entry);
  }
  const hashNode = (current: Node): string => {
    const children = [...current.leaves].map(([name, entry]) => ({ name, mode: entry.mode, sha: entry.sha, sort: name }));
    for (const [name, directory] of current.directories) {
      if (current.leaves.has(name)) throw new StudioError("GIT_PATH_COLLISION");
      children.push({ name, mode: "40000", sha: hashNode(directory), sort: name + "/" });
    }
    children.sort((a, b) => Buffer.compare(Buffer.from(a.sort), Buffer.from(b.sort)));
    return gitObject("tree", Buffer.concat(children.map(child => Buffer.concat([Buffer.from(`${child.mode} ${child.name}\0`), Buffer.from(child.sha, "hex")]))));
  };
  return hashNode(root);
}
