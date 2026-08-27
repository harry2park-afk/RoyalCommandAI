const REPOSITORY = "harry2park-afk/RoyalCommandAI";
const MAX_FILES = 10;
const MAX_FILE_CHARS = 12000;
const MAX_TOTAL_CHARS = 60000;

const DEFAULT_PATHS = [
  "AGENTS.md",
  "src/lib/rcaV2/ruleGate.ts",
  "src/lib/rcaV2/buildAuth.ts",
  "src/lib/rcaV2/tenantContext.ts",
  "src/lib/rcaV2/masterTaskController.ts",
  "src/lib/rcaV2/resourceLockPlan.ts",
  "src/lib/rcaV2/reviewEvidenceGate.ts",
  "src/lib/rcaV2/hostExecutorBoundary.ts",
  "src/app/api/au-v2/build-plan/route.ts",
  "src/app/api/au-v2/executor-preflight/route.ts",
];

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".sql", ".yml", ".yaml", ".toml", ".txt",
]);

type GitTreeItem = {
  path: string;
  type: "blob" | "tree";
  size?: number;
};

type GitTreeResponse = {
  sha?: string;
  tree?: GitTreeItem[];
  truncated?: boolean;
};

export type RcaRepositoryFile = {
  path: string;
  content: string;
  truncated: boolean;
};

export type RcaRepositorySnapshot = {
  repository: string;
  commitSha: string;
  files: RcaRepositoryFile[];
  requestedPaths: string[];
  missingPaths: string[];
  totalChars: number;
  treeTruncated: boolean;
};

function isCommitSha(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{40}$/i.test(value));
}

function extension(path: string) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function isAllowedTextPath(path: string) {
  return path === "AGENTS.md" || path === "README.md" || TEXT_EXTENSIONS.has(extension(path));
}

function normalizeRequestedPaths(paths: unknown): string[] {
  const requested = Array.isArray(paths)
    ? paths.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
    : [];
  const unique = [...new Set(requested.length ? requested : DEFAULT_PATHS)];
  return unique.slice(0, MAX_FILES);
}

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "RoyalCommand-RCA-ReadOnly-Review",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub read failed (${response.status}).`);
  return response.json() as Promise<T>;
}

async function resolveCommitSha(): Promise<string> {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (isCommitSha(vercelSha)) return vercelSha;
  const tree = await githubJson<GitTreeResponse>(
    `https://api.github.com/repos/${REPOSITORY}/git/trees/master`,
  );
  if (!isCommitSha(tree.sha)) throw new Error("Unable to resolve repository commit SHA.");
  return tree.sha;
}

async function fetchTextFile(commitSha: string, path: string): Promise<RcaRepositoryFile> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `https://raw.githubusercontent.com/${REPOSITORY}/${commitSha}/${encodedPath}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Repository file read failed for ${path} (${response.status}).`);
  const text = await response.text();
  const truncated = text.length > MAX_FILE_CHARS;
  return {
    path,
    content: truncated ? text.slice(0, MAX_FILE_CHARS) : text,
    truncated,
  };
}

export async function loadRcaRepositorySnapshot(paths?: unknown): Promise<RcaRepositorySnapshot> {
  const requestedPaths = normalizeRequestedPaths(paths);
  const commitSha = await resolveCommitSha();
  const tree = await githubJson<GitTreeResponse>(
    `https://api.github.com/repos/${REPOSITORY}/git/trees/${commitSha}?recursive=1`,
  );
  if (!Array.isArray(tree.tree)) throw new Error("Repository tree is unavailable.");

  const realFiles = new Set(
    tree.tree
      .filter((item) => item.type === "blob" && isAllowedTextPath(item.path))
      .map((item) => item.path),
  );

  const existingPaths = requestedPaths.filter((path) => realFiles.has(path));
  const missingPaths = requestedPaths.filter((path) => !realFiles.has(path));
  const files: RcaRepositoryFile[] = [];
  let totalChars = 0;

  for (const path of existingPaths) {
    if (totalChars >= MAX_TOTAL_CHARS) break;
    const file = await fetchTextFile(commitSha, path);
    const remaining = MAX_TOTAL_CHARS - totalChars;
    if (file.content.length > remaining) {
      files.push({ ...file, content: file.content.slice(0, remaining), truncated: true });
      totalChars = MAX_TOTAL_CHARS;
      break;
    }
    files.push(file);
    totalChars += file.content.length;
  }

  return {
    repository: REPOSITORY,
    commitSha,
    files,
    requestedPaths,
    missingPaths,
    totalChars,
    treeTruncated: Boolean(tree.truncated),
  };
}
