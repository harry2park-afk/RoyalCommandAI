import { parseJsonObject } from "@/lib/ai/devAgentCodec";
import { getConnector } from "@/lib/ai/connectors";
import type { AIProviderId } from "@/lib/ai/types";

const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BASE_BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const MAX_TREE_PATHS = 1800;
const MAX_READ_FILES = 6;
const MAX_FILE_BYTES = 180_000;
const MAX_FILE_CHARS = 30_000;
const MAX_CONTEXT_CHARS = 120_000;

const DEV_PROVIDERS = new Set<AIProviderId>(["openai", "anthropic", "google", "xai"]);

type GitHubTreeEntry = {
  type?: string;
  path?: string;
  size?: number;
};

type GitHubObject = {
  message?: string;
  sha?: string;
  content?: string;
  tree?: GitHubTreeEntry[];
  [key: string]: unknown;
};

export type RepositoryInspectionEvidence = {
  repository: string;
  branch: string;
  provider: AIProviderId;
  readPaths: string[];
  selector: "provider" | "host-fallback";
};

function safePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("..")) return false;
  if (/^\.git\//i.test(path)) return false;
  if (/(^|\/)(\.env|\.env\.|secrets?)(\/|$)/i.test(path)) return false;
  if (/\.(pem|key|p12|pfx|crt)$/i.test(path)) return false;
  if (/^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(path)) return false;
  return true;
}

function pathForApi(path: string) {
  return encodeURIComponent(path).replace(/%2F/g, "/");
}

async function github(path: string): Promise<GitHubObject> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured in the Royal Command server environment");

  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data: GitHubObject = {};
  try { data = text ? JSON.parse(text) as GitHubObject : {}; }
  catch { data = { message: text }; }
  if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : `GitHub HTTP ${response.status}`);
  return data;
}

function normalizedTerms(prompt: string) {
  const raw = prompt
    .toLowerCase()
    .replace(/github|repository|repo|저장소|실제|정확한|파일|경로|컴포넌트|component|현재|코드|code|찾|검색|읽|확인|검토|분석|렌더링|위치|style|스타일|css|tailwind/g, " ")
    .split(/[^a-z0-9가-힣]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  const compact = prompt.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
  return { terms: Array.from(new Set(raw)).slice(0, 24), compact };
}

function fallbackSelectPaths(paths: string[], prompt: string) {
  const { terms, compact } = normalizedTerms(prompt);
  const scored = paths.map((path) => {
    const lower = path.toLowerCase();
    const compactPath = lower.replace(/[^a-z0-9가-힣]/g, "");
    let score = 0;

    for (const term of terms) {
      if (lower.includes(term)) score += term.length + 2;
      if (compactPath.includes(term.replace(/[^a-z0-9가-힣]/g, ""))) score += term.length;
    }

    if (/ai\s*help|ai\s*helper|도움/i.test(prompt) && /aihelper|helper/i.test(compactPath)) score += 30;
    if (/tool\s*gateway|게이트웨이/i.test(prompt) && /toolgateway|gateway/i.test(compactPath)) score += 30;
    if (/room/i.test(prompt) && /rooms|room/i.test(lower)) score += 4;
    if (compact.length > 6 && compactPath.includes(compact.slice(0, Math.min(compact.length, 24)))) score += 8;

    return { path, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.path.length - b.path.length)
    .slice(0, MAX_READ_FILES)
    .map((item) => item.path);
}

async function selectPathsWithProvider(provider: AIProviderId, prompt: string, paths: string[]) {
  if (!DEV_PROVIDERS.has(provider)) return [];
  const connector = getConnector(provider);
  if (!connector.isConfigured()) return [];

  const response = await connector.complete({
    messages: [
      {
        role: "system",
        content: [
          "You are selecting repository files for a READ-ONLY Royal Command inspection.",
          "Return strict JSON only: {\"readPaths\":[\"src/...\"]}.",
          `Select at most ${MAX_READ_FILES} EXISTING files from the supplied list that are most likely to contain direct evidence needed to answer the user's question.`,
          "Do not invent paths. Do not request secrets, .env, credentials, certificates, private keys, or lockfiles.",
        ].join("\n"),
      },
      {
        role: "user",
        content: `USER QUESTION:\n${prompt}\n\nREPOSITORY FILES:\n${paths.join("\n")}`,
      },
    ],
    temperature: 0,
    maxTokens: 1200,
  });

  if (response.error || !response.content?.trim()) return [];
  try {
    const parsed = parseJsonObject(response.content);
    const selected = Array.isArray(parsed.readPaths) ? parsed.readPaths : [];
    const allowed = new Set(paths);
    return selected
      .filter((value: unknown): value is string => typeof value === "string")
      .map((value: string) => value.trim())
      .filter((value: string) => safePath(value) && allowed.has(value))
      .slice(0, MAX_READ_FILES);
  } catch {
    return [];
  }
}

async function readFile(path: string) {
  const file = await github(`/contents/${pathForApi(path)}?ref=${encodeURIComponent(BASE_BRANCH)}`);
  const content = Buffer.from(typeof file.content === "string" ? file.content : "", "base64").toString("utf8");
  return content.slice(0, MAX_FILE_CHARS);
}

export function isRepositoryInspectionIntent(prompt: string) {
  const repositorySubject = /(github|repository|repo\b|저장소|소스\s*코드|source\s*code|파일\s*(?:트리|경로)|file\s*(?:tree|path))/i.test(prompt);
  const inspectionAction = /(읽|찾|검색|확인|검토|분석|조사|어디|경로|컴포넌트|렌더링|css|tailwind|style|inspect|read|find|search|locate|review|analy[sz]e)/i.test(prompt);
  return repositorySubject && inspectionAction;
}

export async function buildRepositoryInspectionContext(provider: AIProviderId, prompt: string) {
  const tree = await github(`/git/trees/${encodeURIComponent(BASE_BRANCH)}?recursive=1`);
  const paths = (Array.isArray(tree.tree) ? tree.tree : [])
    .filter((entry) => entry.type === "blob" && entry.path && safePath(entry.path) && (entry.size || 0) <= MAX_FILE_BYTES)
    .map((entry) => String(entry.path))
    .slice(0, MAX_TREE_PATHS);

  let readPaths = await selectPathsWithProvider(provider, prompt, paths);
  let selector: RepositoryInspectionEvidence["selector"] = "provider";
  if (!readPaths.length) {
    readPaths = fallbackSelectPaths(paths, prompt);
    selector = "host-fallback";
  }

  if (!readPaths.length) {
    throw new Error("Repository inspection could not identify any relevant safe files from the actual GitHub tree");
  }

  let remaining = MAX_CONTEXT_CHARS;
  const sections: string[] = [];
  const verifiedPaths: string[] = [];

  for (const path of readPaths) {
    if (remaining <= 0) break;
    const content = await readFile(path);
    if (!content.trim()) continue;
    const bounded = content.slice(0, remaining);
    remaining -= bounded.length;
    verifiedPaths.push(path);
    sections.push(`FILE: ${path}\nCONTENT:\n${bounded}`);
  }

  if (!verifiedPaths.length) {
    throw new Error("Repository inspection selected files but no readable source content was returned by GitHub");
  }

  const systemExtra = [
    "ROYAL COMMAND HOST-VERIFIED REPOSITORY EVIDENCE — READ ONLY — AUTHORITATIVE",
    `Repository: ${REPO}`,
    `Branch: ${BASE_BRANCH}`,
    `Files read by host: ${verifiedPaths.join(", ")}`,
    "The source text below was fetched server-side from the actual GitHub repository for this current request.",
    "Use this evidence to answer the user's repository inspection question. Do not claim that repository data is unavailable when the needed evidence appears below.",
    "Do not invent file paths, components, CSS classes, code, commits, writes, builds, previews, or deployments. This evidence grants READ context only and authorizes no mutation.",
    "When stating a repository fact, name the exact file path that supports it.",
    "",
    sections.join("\n\n---\n\n"),
  ].join("\n");

  return {
    systemExtra,
    evidence: {
      repository: REPO,
      branch: BASE_BRANCH,
      provider,
      readPaths: verifiedPaths,
      selector,
    } satisfies RepositoryInspectionEvidence,
  };
}
