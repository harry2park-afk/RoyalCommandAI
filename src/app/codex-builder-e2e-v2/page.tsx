export const dynamic = "force-static";

const REPO = process.env.ROYAL_COMMAND_GITHUB_REPO || "harry2park-afk/RoyalCommandAI";
const BASE_BRANCH = process.env.ROYAL_COMMAND_GITHUB_BRANCH || "master";
const MODEL = process.env.OPENAI_CODEX_MODEL || "gpt-5.3-codex";
const WORK_ID = "RC-20260825-LIVETEST02";
const WORK_BRANCH = "rc-work/rc-20260825-livetest02/codex-rev-01";
const TEST_PATH = "docs/rc-builder-live-selftest-v2.md";

type JsonObject = Record<string, unknown>;

function textFromResponse(body: JsonObject) {
  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text.trim();
  const out = Array.isArray(body.output) ? body.output : [];
  const parts: string[] = [];
  for (const item of out) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as JsonObject).content) ? (item as JsonObject).content as unknown[] : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as JsonObject).text === "string") parts.push((part as JsonObject).text as string);
    }
  }
  return parts.join("\n").trim();
}

async function github(path: string, init?: RequestInit) {
  const token = (process.env.GITHUB_TOKEN || "").trim();
  if (!token) throw new Error("E2E_V2: GITHUB_TOKEN missing");
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const raw = await res.text();
  let body: JsonObject = {};
  try { body = raw ? JSON.parse(raw) as JsonObject : {}; } catch { body = { message: raw }; }
  if (!res.ok) throw new Error(`E2E_V2 GitHub ${res.status}: ${String(body.message || "request failed")}`);
  return body;
}

async function codexArtifact() {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("E2E_V2: OPENAI_API_KEY missing");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      input: `Return JSON only: {"contentBase64":"BASE64_UTF8"}. The decoded Markdown must contain exactly these two lines:\n# RC Builder Live Self-Test V2\nCodex generated this safe test artifact for ${WORK_ID}.`,
      reasoning: { effort: "medium" },
      max_output_tokens: 4096,
    }),
    cache: "no-store",
  });
  const raw = await res.text();
  const body = raw ? JSON.parse(raw) as JsonObject : {};
  if (!res.ok) throw new Error(`E2E_V2 Codex: ${String((body.error as JsonObject | undefined)?.message || res.status)}`);
  const output = textFromResponse(body).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("E2E_V2: Codex JSON missing");
  const parsed = JSON.parse(output.slice(start, end + 1)) as JsonObject;
  const encoded = typeof parsed.contentBase64 === "string" ? parsed.contentBase64 : "";
  const content = Buffer.from(encoded, "base64").toString("utf8").trim();
  if (!content.includes("RC Builder Live Self-Test V2") || !content.includes(WORK_ID)) throw new Error("E2E_V2: Codex artifact validation failed");
  return content;
}

async function run() {
  const content = await codexArtifact();
  let branchExists = true;
  try { await github(`/git/ref/heads/${encodeURIComponent(WORK_BRANCH)}`); }
  catch { branchExists = false; }
  if (!branchExists) {
    const base = await github(`/git/ref/heads/${encodeURIComponent(BASE_BRANCH)}`);
    const object = base.object && typeof base.object === "object" ? base.object as JsonObject : {};
    const sha = typeof object.sha === "string" ? object.sha : "";
    if (!sha) throw new Error("E2E_V2: master SHA missing");
    await github("/git/refs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: `refs/heads/${WORK_BRANCH}`, sha }) });
  }

  const filePath = TEST_PATH.split("/").map(encodeURIComponent).join("/");
  try { await github(`/contents/${filePath}?ref=${encodeURIComponent(WORK_BRANCH)}`); }
  catch {
    const created = await github(`/contents/${filePath}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `[${WORK_ID}][REV-01][Codex] create ${TEST_PATH}`, content: Buffer.from(content, "utf8").toString("base64"), branch: WORK_BRANCH }),
    });
    const commit = created.commit && typeof created.commit === "object" ? created.commit as JsonObject : {};
    if (typeof commit.sha !== "string" || !commit.sha) throw new Error("E2E_V2: commit evidence missing");
  }
  return true;
}

export default async function E2EV2() {
  await run();
  return <main>RC Builder Codex E2E V2 branch+commit PASS</main>;
}
