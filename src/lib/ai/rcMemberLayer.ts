import type { AIProviderId } from "@/lib/ai/types";

export const RC_MEMBER_PROVIDER_IDS = ["openai", "anthropic", "google", "xai", "codex"] as const satisfies readonly AIProviderId[];

export const RC_MEMBER_PROVIDER_NAMES: Partial<Record<AIProviderId, string>> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
  codex: "Codex",
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

function selectedMembers(selected?: AIProviderId[]) {
  return Array.from(new Set((selected || []).filter((id) => RC_MEMBER_PROVIDER_IDS.includes(id as (typeof RC_MEMBER_PROVIDER_IDS)[number]))));
}

/** Only an explicit global no-write or no-execute instruction blocks repository mutation. */
export function hasGlobalNoWriteIntent(prompt: string) {
  return /(?:코드|파일|소스|repository|repo|저장소).{0,24}(?:수정|변경|구현|작성|생성|삭제|제거|커밋|commit|push).{0,16}(?:하지\s*마|하지\s*말|하지\s*않|금지|없이)|(?:실행|진행|작업|수행).{0,8}(?:하지\s*마|하지\s*말|하지\s*않)|읽기\s*전용|read[- ]?only|do\s+not\s+(?:modify|edit|change|write|commit|push|execute)|no\s+(?:code\s+)?changes?/i.test(prompt);
}

function hasMutationRequest(prompt: string) {
  const explicitMutationVerb = /(?:수정해|수정하세요|고쳐|고치세요|변경해|변경하세요|바꿔|바꾸세요|구현해|구현하세요|추가해|추가하세요|삭제해|삭제하세요|제거해|제거하세요|생성해|생성하세요|적용해|적용하세요|반영해|반영하세요|배포해|배포하세요|커밋해|커밋하세요|푸시해|푸시하세요|머지해|머지하세요|\b(?:deploy|commit|push|merge)\s+(?:it|this|these|the|my|our|changes?|branch|code|update|fix)\b)/i;
  const mutationTarget = /(?:코드|파일|소스|github|repository|repo\b|저장소|브랜치|branch|commit|커밋|push|merge|배포|deploy|vercel|ui|화면|레이아웃|component|tsx|typescript|css|기능|api|database|db\b|데이터베이스|schema|스키마|migration|마이그레이션|웹사이트|홈페이지|페이지|앱|route|라우트)/i;

  const targetThenVerb = new RegExp(`${mutationTarget.source}.{0,48}${explicitMutationVerb.source}`, "i");
  const verbThenTarget = new RegExp(`${explicitMutationVerb.source}.{0,48}${mutationTarget.source}`, "i");
  return targetThenVerb.test(prompt) || verbThenTarget.test(prompt);
}

function hasExplicitExecutionRequest(prompt: string) {
  const executionVerb = /(실행해|실행하세요|진행해|진행하세요|완료해|완료하세요|끝내|끝내세요|수행해|수행하세요|작업해|작업하세요|execute|implement|apply\s+(?:it|the\s+change)|make\s+the\s+change)/i.test(prompt);
  const mutationTarget = /(코드|파일|소스|github|repository|repo\b|저장소|브랜치|branch|commit|커밋|push|merge|배포|deploy|vercel|ui|화면|레이아웃|component|tsx|typescript|css|기능|api|database|db\b|데이터베이스|schema|스키마|migration|마이그레이션|웹사이트|홈페이지|페이지|앱|route|라우트)/i.test(prompt);
  return executionVerb && mutationTarget;
}

function hasInspectIntent(prompt: string) {
  return /(검토|검증|점검|조사|분석|진단|원인|inspect|investigate|review|verify|diagnos|analy[sz]e)/i.test(prompt);
}

function hasContinuationIntent(prompt: string) {
  return /(이전|앞의|위의|위에|방금|아까|앞서).{0,20}(작업|요청|지시|내용|오더|명령).{0,20}(계속|이어서|완료|끝내|다시|실행)|(?:위|위에|앞|방금)\s*(?:오더|작업|명령|지시).{0,20}(?:다시|계속|이어서)?\s*(?:실행|진행|완료)|(?:계속|이어서)\s*(?:진행|작업|실행)/i.test(prompt);
}

function classifyDirect(prompt: string): RcMemberMode {
  if (hasGlobalNoWriteIntent(prompt)) return hasInspectIntent(prompt) ? "inspect" : "answer";
  if (hasMutationRequest(prompt) || hasExplicitExecutionRequest(prompt)) return "execute";
  if (hasInspectIntent(prompt)) return "inspect";
  return "answer";
}

function previousActionableOrder(history?: RcMemberHistoryMessage[]) {
  const userMessages = (history || [])
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);

  for (let index = userMessages.length - 1, depth = 0; index >= 0 && depth < 3; index -= 1, depth += 1) {
    const candidate = userMessages[index];
    const mode = classifyDirect(candidate);
    if (mode !== "answer") return candidate;
    if (!hasContinuationIntent(candidate)) return null;
  }
  return null;
}

export function resolveRcMemberCommand(
  prompt: string,
  history?: RcMemberHistoryMessage[],
  selected?: AIProviderId[],
): RcMemberCommand {
  const current = prompt.trim();
  const selectedIds = selectedMembers(selected);
  let effectivePrompt = current;
  let mode = classifyDirect(current);
  let continuedFromPriorOrder = false;

  if (hasContinuationIntent(current) && !hasGlobalNoWriteIntent(current)) {
    const prior = previousActionableOrder(history);
    if (prior) {
      const currentMode = classifyDirect(current);
      mode = currentMode === "answer" ? classifyDirect(prior) : currentMode;
      continuedFromPriorOrder = true;
      effectivePrompt = `${prior}\n\nFollow-up instruction: ${current}`;
    }
  }

  const leadProviders = mode === "execute" ? selectedIds.slice(0, 1) : selectedIds;
  const reviewOnlyProviders = mode === "execute" ? selectedIds.slice(1) : [];

  return {
    mode,
    leadProviders,
    reviewOnlyProviders,
    gitWrite: mode === "execute" && leadProviders.length > 0,
    productionAllowed: false,
    effectivePrompt,
    continuedFromPriorOrder,
    reason: mode === "execute"
      ? leadProviders.length
        ? `Single Write Authority: ${RC_MEMBER_PROVIDER_NAMES[leadProviders[0]!] || leadProviders[0]} is the sole writer for this task; ${reviewOnlyProviders.length} selected AI(s) are reserved for review.`
        : "Repository mutation requested, but no active AI was selected; no implicit provider fallback is allowed."
      : mode === "inspect"
        ? "Review/inspection request; selected AI may investigate without repository mutation."
        : "Open answer mode; selected AI may reason and respond freely.",
  };
}
