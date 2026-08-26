import type { AIProviderId } from "@/lib/ai/types";

export const RC_MEMBER_PROVIDER_IDS = ["openai", "anthropic", "google", "xai"] as const satisfies readonly AIProviderId[];

export const RC_MEMBER_PROVIDER_NAMES: Partial<Record<AIProviderId, string>> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
};

export type RcMemberMode = "answer" | "inspect" | "execute";

export type RcMemberHistoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type RcMemberCommand = {
  mode: RcMemberMode;
  leadProviders: AIProviderId[];
  reviewOnlyProviders: AIProviderId[];
  gitWrite: boolean;
  productionAllowed: boolean;
  effectivePrompt: string;
  continuedFromPriorOrder: boolean;
  reason: string;
};

const PROVIDER_MENTIONS: Array<{ id: AIProviderId; pattern: RegExp }> = [
  { id: "openai", pattern: /(chatgpt|openai|챗지피티|챗GPT)/i },
  { id: "anthropic", pattern: /(claude|클로드)/i },
  { id: "google", pattern: /(gemini|제미나이)/i },
  { id: "xai", pattern: /(grok|그록)/i },
];

function selectedMembers(selected?: AIProviderId[]) {
  return (selected || []).filter((id) => RC_MEMBER_PROVIDER_IDS.includes(id as (typeof RC_MEMBER_PROVIDER_IDS)[number]));
}

function hasDevelopmentSubject(prompt: string) {
  return /(코드|개발|버그|오류|ui|화면|레이아웃|사이드바|버튼|기능|파일|github|repository|repo\b|저장소|commit|push|merge|배포|vercel|component|tsx|typescript|css|시스템|라우팅|api|웹사이트|홈페이지|페이지|앱|agent|에이전트|실행\s*구조|로그|source\s*code)/i.test(prompt);
}

function hasDirectExecuteIntent(prompt: string) {
  return /(수정해(?:\s*줘|\s*주세요)?|수정하세요|고쳐(?:\s*줘|\s*주세요)?|고치세요|변경해(?:\s*줘|\s*주세요)?|변경하세요|바꿔(?:\s*줘|\s*주세요)?|바꾸세요|교체해(?:\s*줘|\s*주세요)?|반영해(?:\s*줘|\s*주세요)?|반영하세요|적용해(?:\s*줘|\s*주세요)?|적용하세요|구현해(?:\s*줘|\s*주세요)?|구현하세요|만들어(?:\s*줘|\s*주세요)?|만드세요|추가해(?:\s*줘|\s*주세요)?|추가하세요|넣어(?:\s*줘|\s*주세요)?|삭제해(?:\s*줘|\s*주세요)?|삭제하세요|제거해(?:\s*줘|\s*주세요)?|제거하세요|실행해(?:\s*줘|\s*주세요)?|실행하세요|실행\s*담당|작업해(?:\s*줘|\s*주세요)?|작업하세요|끝내(?:\s*줘|\s*주세요|세요)|진행해(?:\s*줘|\s*주세요)?|진행하세요|실제\s*github\s*개발\s*실행|코드를\s*(?:써|작성해|작성하세요|변경해|수정해)|파일을\s*(?:생성해|생성하세요|수정해|변경해|삭제해)|실제로\s*(?:수정해|변경해|구현해|실행해|작업해))/i.test(prompt);
}

function hasInspectIntent(prompt: string) {
  return /(조사\s*담당|조사해|조사하세요|원인\s*(?:조사|분석|진단|확인)|근본\s*원인|분석해|분석하세요|진단해|진단하세요|검토해|검토하세요|확인해|확인하세요|읽어|읽고|찾아|찾고|inspect|investigate|root\s*cause|diagnos|analy[sz]e|review|read[- ]?only)/i.test(prompt);
}

function removeProductionOnlySafetyGates(prompt: string) {
  return prompt
    .replace(/production.{0,18}(?:배포|deploy|merge).{0,18}(?:하지\s*마|하지\s*말|하지\s*않|금지)/gi, "")
    .replace(/(?:배포|deploy|merge).{0,18}(?:하지\s*마|하지\s*말|하지\s*않|금지).{0,18}production/gi, "");
}

export function hasGlobalNoWriteIntent(prompt: string) {
  const scoped = removeProductionOnlySafetyGates(prompt);
  const codeMutationForbidden = /(?:코드|파일|ui|화면|레이아웃|component|tsx|typescript|css|기능).{0,35}(?:수정|변경|구현|작성|생성|삭제|제거|적용|반영).{0,20}(?:금지|하지\s*마|하지\s*말|하지\s*않|하지\s*마세요|하지\s*마십시오)/i.test(scoped)
    || /(?:수정|변경|구현|작성|생성|삭제|제거|적용|반영).{0,20}(?:금지|하지\s*마|하지\s*말|하지\s*않|하지\s*마세요|하지\s*마십시오).{0,35}(?:코드|파일|ui|화면|레이아웃|component|tsx|typescript|css|기능)/i.test(scoped)
    || /(코드\s*수정\s*금지|코드\s*수정\s*없이|수정\s*없이|변경\s*없이|읽기\s*전용|read[- ]?only)/i.test(scoped);
  const gitMutationForbidden = /(?:commit|커밋|pull\s*request|pr\b|push|branch|브랜치).{0,25}(?:생성|작성|수정|실행)?.{0,15}(?:금지|하지\s*마|하지\s*말|하지\s*않)/i.test(scoped)
    || /(?:commit|커밋|pr|pull\s*request)\s*(?:생성\s*)?금지/i.test(scoped);
  const executionForbidden = /(?:개발\s*(?:실행|agent|에이전트)|실제\s*실행|코드\s*실행|실행).{0,14}(?:금지|하지\s*마|하지\s*말|하지\s*않)/i.test(scoped);
  return codeMutationForbidden || gitMutationForbidden || executionForbidden;
}

function referencesPriorOrder(prompt: string) {
  return /(?:위(?:에|의)?|앞(?:에|의)?|이전|방금|아까|앞서|기존)\s*(?:오더|명령|지시|작업|요청)|(?:그|이)\s*(?:오더|명령|지시|작업|요청).{0,20}(?:다시|계속|이어)|(?:다시\s*실행|재실행|계속\s*(?:해|진행)|이어서\s*(?:해|진행)).{0,20}(?:주세요|줘|하세요|해)/i.test(prompt);
}

function asksAllMembers(prompt: string) {
  return /(4\s*ai|네\s*ai|4개\s*ai|모든\s*ai|ai\s*모두|전부\s*(?:실행|작업|조사|검토)|all\s+(?:four\s+)?(?:ais?|providers?|models?))/i.test(prompt);
}

function assignedProviders(prompt: string, selected?: AIProviderId[]) {
  const selectedIds = selectedMembers(selected);
  if (asksAllMembers(prompt)) return selectedIds.length ? selectedIds : [...RC_MEMBER_PROVIDER_IDS];

  const assignmentAction = "(?:만\\s*)?(?:실행\\s*담당|개발\\s*담당|작업\\s*담당|수정\\s*담당|구현\\s*담당|조사\\s*담당|분석\\s*담당|검토\\s*담당|답변\\s*담당)";
  const assigned = PROVIDER_MENTIONS
    .filter(({ pattern }) => new RegExp(`${pattern.source}.{0,20}${assignmentAction}`, "i").test(prompt))
    .map(({ id }) => id);
  if (assigned.length) return Array.from(new Set(assigned));

  const onlyNamed = PROVIDER_MENTIONS
    .filter(({ pattern }) => new RegExp(`${pattern.source}.{0,12}(?:만|only)`, "i").test(prompt))
    .map(({ id }) => id);
  if (onlyNamed.length) return Array.from(new Set(onlyNamed));

  return selectedIds;
}

function reviewOnlyProviders(prompt: string, leads: AIProviderId[], selected?: AIProviderId[]) {
  const scopedReviewOnly = /(다른|나머지|그\s*외|타)\s*(?:ai|에이아이|모델).{0,25}(?:검토|리뷰|review)\s*만/i.test(prompt);
  if (!scopedReviewOnly) return [];
  const pool = selectedMembers(selected).length ? selectedMembers(selected) : [...RC_MEMBER_PROVIDER_IDS];
  return pool.filter((id) => !leads.includes(id));
}

function classifyDirect(prompt: string): RcMemberMode {
  const noWrite = hasGlobalNoWriteIntent(prompt);
  const development = hasDevelopmentSubject(prompt);
  const inspect = hasInspectIntent(prompt);
  const execute = hasDirectExecuteIntent(prompt) && development;

  if (noWrite) return development || inspect ? "inspect" : "answer";
  if (execute) return "execute";
  if (inspect && development) return "inspect";
  return "answer";
}

function previousUserOrder(history?: RcMemberHistoryMessage[]) {
  const userMessages = (history || []).filter((message) => message.role === "user").map((message) => message.content.trim()).filter(Boolean);
  let index = userMessages.length - 1;
  let depth = 0;
  while (index >= 0 && depth <= 6) {
    const candidate = userMessages[index];
    const mode = classifyDirect(candidate);
    if (mode !== "answer") return candidate;
    if (!referencesPriorOrder(candidate)) return null;
    index -= 1;
    depth += 1;
  }
  return null;
}

export function resolveRcMemberCommand(
  prompt: string,
  history?: RcMemberHistoryMessage[],
  selected?: AIProviderId[],
): RcMemberCommand {
  const current = prompt.trim();
  let effectivePrompt = current;
  let mode = classifyDirect(current);
  let continuedFromPriorOrder = false;
  let inheritedProviders: AIProviderId[] = [];

  if (referencesPriorOrder(current)) {
    const prior = previousUserOrder(history);
    if (prior) {
      const priorMode = classifyDirect(prior);
      const currentNoWrite = hasGlobalNoWriteIntent(current);
      const currentInspect = hasInspectIntent(current);
      const currentExecute = hasDirectExecuteIntent(current);
      mode = currentNoWrite ? "inspect" : currentExecute ? "execute" : currentInspect ? "inspect" : priorMode;
      inheritedProviders = assignedProviders(prior, selected);
      continuedFromPriorOrder = true;
      effectivePrompt = [
        prior,
        "",
        "ROYAL COMMAND CONTINUATION — continue only the immediately preceding user-order chain above.",
        "Do not inherit any unrelated older task.",
        `Follow-up instruction: ${current}`,
      ].join("\n");
    }
  }

  const explicitProviders = assignedProviders(current, continuedFromPriorOrder ? undefined : selected);
  const selectedIds = selectedMembers(selected);
  const leadProviders = explicitProviders.length
    ? explicitProviders
    : inheritedProviders.length
      ? inheritedProviders
      : selectedIds;
  const normalizedLeads = leadProviders.length ? leadProviders : (mode === "execute" ? ["openai" as AIProviderId] : []);
  const reviewers = reviewOnlyProviders(current, normalizedLeads, selected);

  return {
    mode,
    leadProviders: normalizedLeads,
    reviewOnlyProviders: reviewers,
    gitWrite: mode === "execute",
    productionAllowed: false,
    effectivePrompt,
    continuedFromPriorOrder,
    reason: mode === "execute"
      ? "Explicit development mutation request routed through the shared RC Host Executor."
      : mode === "inspect"
        ? "Read-only investigation/inspection request; repository mutation is forbidden."
        : "Normal answer mode; no repository mutation is authorized.",
  };
}
