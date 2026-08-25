import fs from 'node:fs';

const path = 'src/app/api/builder/route.ts';
let source = fs.readFileSync(path, 'utf8');

const codexPattern = /async function codexJson\(instruction: string, maxOutputTokens = 12_000\) \{[\s\S]*?\n\}\n\nasync function updateWork/;
const codexReplacement = `async function codexJson(instruction: string, maxOutputTokens = 12_000) {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured for RC Builder");

  const requestOnce = async (effort: "high" | "medium", outputBudget: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CODEX_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: \`Bearer \${key}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: CODEX_MODEL,
          input: instruction,
          reasoning: { effort },
          max_output_tokens: outputBudget,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      const text = await response.text();
      let body: any = {};
      try { body = text ? JSON.parse(text) : {}; }
      catch { throw new Error(\`Codex returned non-JSON HTTP \${response.status}\`); }
      if (!response.ok) {
        throw new Error(body?.error?.message || \`Codex Responses API HTTP \${response.status}\`);
      }

      return {
        body,
        output: responseText(body),
        exhausted: body?.status === "incomplete" && body?.incomplete_details?.reason === "max_output_tokens",
      };
    } catch (error) {
      if (controller.signal.aborted) throw new Error(\`Codex Builder timed out after \${Math.round(CODEX_TIMEOUT_MS / 1000)}s\`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  const first = await requestOnce("high", maxOutputTokens);
  if (first.output) return parseJsonObject(first.output);

  if (first.exhausted) {
    const retryBudget = Math.min(Math.max(maxOutputTokens * 2, 8_000), 24_000);
    logger.warn("builder.codex_output_retry", {
      model: CODEX_MODEL,
      firstBudget: maxOutputTokens,
      retryBudget,
      reason: "reasoning consumed output budget before final JSON",
    });
    const retry = await requestOnce("medium", retryBudget);
    if (retry.output) return parseJsonObject(retry.output);
  }

  throw new Error("Codex returned an empty Builder response");
}

async function updateWork`;

if (!codexPattern.test(source)) throw new Error('codexJson function pattern not found');
source = source.replace(codexPattern, codexReplacement);

const prPattern = /async function createPullRequest\(work: WorkMeta, branch: string, commits: Array<\{ path: string; operation: string; commit: string \}>\) \{[\s\S]*?\n\}\n\nasync function persistMessages/;
const prReplacement = `async function findOpenBuilderPullRequest(branch: string) {
  const owner = REPO.split("/")[0] || "";
  const prs = await github(\`/pulls?head=\${encodeURIComponent(owner + ":" + branch)}&base=\${encodeURIComponent(BASE_BRANCH)}&state=open\`);
  const first = Array.isArray(prs) ? prs[0] : null;
  return first ? { number: first.number || null, url: first.html_url || "" } : null;
}

async function createPullRequest(work: WorkMeta, branch: string, commits: Array<{ path: string; operation: string; commit: string }>) {
  void work;
  void commits;

  const existing = await findOpenBuilderPullRequest(branch);
  if (existing) return existing;

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    const created = await findOpenBuilderPullRequest(branch);
    if (created) return created;
  }

  throw new Error("GitHub-native RC Builder PR workflow did not create a PR within 45 seconds");
}

async function persistMessages`;

if (!prPattern.test(source)) throw new Error('createPullRequest function pattern not found');
source = source.replace(prPattern, prReplacement);

fs.writeFileSync(path, source);
console.log('Builder E2E hardening patch applied.');
