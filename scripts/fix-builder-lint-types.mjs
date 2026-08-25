import fs from 'node:fs';

const path = 'src/app/api/builder/route.ts';
let source = fs.readFileSync(path, 'utf8');

const insertAfter = `type BuilderAction = {\n  path: string;\n  operation: "create" | "update" | "delete";\n  reason?: string;\n  content?: string;\n};\n`;
const types = `\ntype GitHubObject = {\n  message?: string;\n  sha?: string;\n  content?: string;\n  object?: { sha?: string };\n  commit?: { sha?: string };\n  number?: number;\n  html_url?: string;\n  tree?: Array<{ type?: string; path?: string; size?: number }>;\n  [key: string]: unknown;\n};\n\ntype CodexResponseBody = {\n  output_text?: string;\n  output?: Array<{ content?: Array<{ text?: string }> }>;\n  status?: string;\n  incomplete_details?: { reason?: string };\n  error?: { message?: string };\n  model?: string;\n  id?: string;\n};\n\ntype BuilderChatData = {\n  roomId: string;\n  prompt: string;\n  language?: string;\n  history?: unknown;\n};\n\ntype BuilderPersistResult = {\n  finalAnswer: string;\n  workId: string;\n  revision: number;\n  evidence: Record<string, unknown>;\n  latencyMs: number;\n  [key: string]: unknown;\n};\n`;
if (!source.includes('type GitHubObject = {')) {
  if (!source.includes(insertAfter)) throw new Error('BuilderAction insertion point not found');
  source = source.replace(insertAfter, insertAfter + types);
}

source = source.replace(
  'async function github(path: string, init?: RequestInit) {',
  'async function github<T extends GitHubObject | GitHubObject[] = GitHubObject>(path: string, init?: RequestInit): Promise<T> {'
);
source = source.replace(
  '  let data: any = {};\n  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }\n  if (!response.ok) throw new Error(data?.message || `GitHub HTTP ${response.status}`);\n  return data;',
  '  let data: GitHubObject | GitHubObject[] = {};\n  try { data = text ? JSON.parse(text) as GitHubObject | GitHubObject[] : {}; } catch { data = { message: text }; }\n  const errorMessage = !Array.isArray(data) && typeof data.message === "string" ? data.message : `GitHub HTTP ${response.status}`;\n  if (!response.ok) throw new Error(errorMessage);\n  return data as T;'
);

source = source.replace(
  'function responseText(body: any) {\n  if (typeof body?.output_text === "string" && body.output_text.trim()) return body.output_text.trim();\n  const parts: string[] = [];\n  for (const item of Array.isArray(body?.output) ? body.output : []) {\n    for (const content of Array.isArray(item?.content) ? item.content : []) {\n      if (typeof content?.text === "string") parts.push(content.text);\n    }\n  }\n  return parts.join("\\n").trim();\n}',
  'function responseText(body: CodexResponseBody) {\n  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text.trim();\n  const parts: string[] = [];\n  for (const item of Array.isArray(body.output) ? body.output : []) {\n    for (const content of Array.isArray(item.content) ? item.content : []) {\n      if (typeof content.text === "string") parts.push(content.text);\n    }\n  }\n  return parts.join("\\n").trim();\n}'
);
source = source.replace(
  '      let body: any = {};\n      try { body = text ? JSON.parse(text) : {}; }',
  '      let body: CodexResponseBody = {};\n      try { body = text ? JSON.parse(text) as CodexResponseBody : {}; }'
);

source = source.replace(
  '  const prs = await github(`/pulls?head=${encodeURIComponent(owner + ":" + branch)}&base=${encodeURIComponent(BASE_BRANCH)}&state=open`);',
  '  const prs = await github<GitHubObject[]>(`/pulls?head=${encodeURIComponent(owner + ":" + branch)}&base=${encodeURIComponent(BASE_BRANCH)}&state=open`);'
);

source = source.replace(
  'async function persistMessages(user: Awaited<ReturnType<typeof getCurrentUser>>, data: any, result: any) {',
  'async function persistMessages(user: Awaited<ReturnType<typeof getCurrentUser>>, data: BuilderChatData, result: BuilderPersistResult) {'
);

source = source.replace(
  '    const actions: BuilderAction[] = rawActions.map((item: any) => {\n      const path = String(item?.path || "").trim();\n      const operation: BuilderAction["operation"] = item?.operation === "create" || item?.operation === "delete" ? item.operation : "update";',
  '    const actions: BuilderAction[] = rawActions.map((value: unknown) => {\n      const item = value && typeof value === "object" ? value as Record<string, unknown> : {};\n      const path = String(item.path || "").trim();\n      const operation: BuilderAction["operation"] = item.operation === "create" || item.operation === "delete" ? item.operation : "update";'
);
source = source.replaceAll('item?.reason', 'item.reason');
source = source.replaceAll('item?.contentBase64', 'item.contentBase64');

fs.writeFileSync(path, source);
console.log('Builder lint types fixed.');
