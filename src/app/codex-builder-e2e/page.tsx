export const dynamic = "force-static";

const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BASE_BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const CODEX_MODEL = process.env.OPENAI_CODEX_MODEL || "gpt-5.3-codex";
const WORK_ID = "RC-20260825-LIVETEST01";
const TEST_BRANCH = "rc-work/rc-20260825-livetest01/codex-rev-01";
const TEST_PATH = "docs/rc-builder-live-selftest.md";

function responseText(body: any) {
  if (typeof body?.output_text === "string" && body.output_text.trim()) return body.output_text.trim();
  const parts: string[] = [];
  for (const item of Array.isArray(body?.output) ? body.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function extractJson(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`E2E: Codex did not return JSON; output=${trimmed.slice(0, 400) || "<empty>"}`);
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function gh(path: string, init?: RequestInit) {
  const token = (process.env.GITHUB_TOKEN || "").trim();
  if (!token) throw new Error("E2E: GITHUB_TOKEN missing");
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const raw = await response.text();
  let body: any = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { message: raw }; }
  if (!response.ok) throw new Error(`E2E GitHub ${response.status}: ${body?.message || "request failed"}`);
  return body;
}

async function codexGenerateTestFile() {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("E2E: OPENAI_API_KEY missing");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CODEX_MODEL,
      input: [
        "You are the Royal Command RC Builder live test.",
        `Work ID: ${WORK_ID}`,
        `Target file: ${TEST_PATH}`,
        "Return JSON only with exactly this shape: {\"contentBase64\":\"BASE64_UTF8\"}.",
        "The decoded Markdown file must contain exactly two short lines: first line '# RC Builder Live Self-Test'; second line 'Codex generated this safe test artifact for RC-20260825-LIVETEST01.'",
        "Do not add markdown fences or any other keys."
      ].join("\n"),
      reasoning: { effort: "medium" },
      max_output_tokens: 4096,
    }),
    cache: "no-store",
  });
  const raw = await response.text();
  let body: any = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok) throw new Error(`E2E Codex: ${body?.error?.message || `HTTP ${response.status}`}`);
  const output = responseText(body);
  if (!output) throw new Error(`E2E: Codex empty output; status=${body?.status || "unknown"}; incomplete=${JSON.stringify(body?.incomplete_details || null)}; outputTypes=${JSON.stringify((body?.output || []).map((x: any) => x?.type))}`);
  const parsed = extractJson(output);
  const encoded = typeof parsed?.contentBase64 === "string" ? parsed.contentBase64.trim() : "";
  if (!encoded) throw new Error("E2E: Codex returned no contentBase64");
  const content = Buffer.from(encoded, "base64").toString("utf8").trim();
  if (!content.includes("RC Builder Live Self-Test") || !content.includes(WORK_ID)) throw new Error("E2E: Codex artifact validation failed");
  return { content, responseId: body?.id || null, model: body?.model || CODEX_MODEL };
}

async function runE2E() {
  const codex = await codexGenerateTestFile();
  const branchRefPath = `/git/ref/heads/${encodeURIComponent(TEST_BRANCH)}`;
  let branchSha = "";
  try {
    const existing = await gh(branchRefPath);
    branchSha = existing?.object?.sha || "";
  } catch {
    const base = await gh(`/git/ref/heads/${encodeURIComponent(BASE_BRANCH)}`);
    branchSha = base?.object?.sha || "";
    if (!branchSha) throw new Error("E2E: base branch SHA missing");
    await gh("/git/refs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: `refs/heads/${TEST_BRANCH}`, sha: branchSha }),
    });
  }

  let commitSha = "";
  const fileApi = `/contents/${TEST_PATH.split("/").map(encodeURIComponent).join("/")}`;
  try {
    const existingFile = await gh(`${fileApi}?ref=${encodeURIComponent(TEST_BRANCH)}`);
    commitSha = existingFile?.sha || "existing";
  } catch {
    const created = await gh(fileApi, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `[${WORK_ID}][REV-01][Codex] create ${TEST_PATH}`,
        content: Buffer.from(codex.content, "utf8").toString("base64"),
        branch: TEST_BRANCH,
      }),
    });
    commitSha = created?.commit?.sha || "";
    if (!commitSha) throw new Error("E2E: GitHub commit SHA missing");
  }

  const pulls = await gh(`/pulls?state=open&head=${encodeURIComponent(`harry2park-afk:${TEST_BRANCH}`)}`);
  let pr = Array.isArray(pulls) ? pulls[0] : null;
  if (!pr) {
    pr = await gh("/pulls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `[${WORK_ID}][REV-01][Codex] RC Builder live self-test`,
        head: TEST_BRANCH,
        base: BASE_BRANCH,
        body: `Work ID: ${WORK_ID}\nModel: ${codex.model}\nSafe live E2E test only. DO NOT MERGE.`,
      }),
    });
  }

  if (!pr?.number || !pr?.html_url) throw new Error("E2E: Pull request evidence missing");
  return { model: codex.model, responseId: codex.responseId, branch: TEST_BRANCH, commitSha, prNumber: pr.number, prUrl: pr.html_url };
}

export default async function CodexBuilderE2EPage() {
  const result = await runE2E();
  return <main>RC Builder E2E PASS — {result.model} — PR #{result.prNumber}</main>;
}
