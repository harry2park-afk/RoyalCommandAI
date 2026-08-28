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

/**
 * Minimal explicit no-write guard.
 *
 * We intentionally do not try to infer dozens of subtle policy phrases here.
 * The user has to say plainly that code/files must not be changed, or ask for
 * read-only/inspection. This prevents ordinary design/review language from
 * accidentally triggering or blocking execution.
 */
export function hasGlobalNoWriteIntent(prompt: string) {
  return /(?:아직\s*)?(?:코드|파일|소스|repository|repo|저장소).{0,30}(?:수정|변경|구현|작성|생성|삭제|제거|적용|반영|커밋|commit|push).{0,20}(?:하지\s*마|하지\s*말|하지\s*않|금지)|(?:수정|변경|구현|작성|생성|삭제|제거|적용|반영|커밋|commit|push).{0,20}(?:하지\s*마|하지\s*말|하지\s*않|금지).{0,30}(?:코드|파일|소스|repository|repo|저장소)|읽기\s*전용|read[- ]?only|do\s+not\s+(?:modify|edit|change|write|commit|push)|no\s+(?:code\s+)?changes?/i.test(prompt);
}

function hasMutationTarget(prompt: string) {
  return /(코드|파일|소스|github|repository|repo\b|저장소|브랜치|branch|commit|커밋|push|merge|배포|deploy|vercel|ui|화면|레이아웃|component|tsx|typescript|css|기능|api|database|db\b|데이터베이스|schema|스키마|migration|마이그레이션|웹사이트|홈페이지|페이지|앱|route|라우트)/i.test(prompt);
}

function hasMutationAction(prompt: string) {
  return /(수정해|수정하세요|고쳐|고치세요|변경해|변경하세요|바꿔|바꾸세요|교체해|반영해|반영하세요|적용해|적용하세요|구현해|구현하세요|추가해|추가하세요|넣어|삭제해|삭제하세요|제거해|제거하세요|생성해|생성하세요|코드를\s*(?:써|작성해|작성하세요)|파일을\s*(?:만들어|생성해|수정해|변경해|삭제해)|실제로\s*(?:수정|변경|구현|적용|반영|배포|deploy|commit|커밋|push)|(?:배포|deploy|commit|커밋|push|merge)\s*(?:해|하세요|해주세요|해줘))/i.test(prompt);
}

function hasInspectIntent(prompt: string) {
  return /(검토|검증|점검|조사|분석|진단|확인|원인|찾아|읽어|inspect|investigate|review|verify|check|diagnos|analy[sz]e)/i.test(prompt);
}

function referencesPriorOrder(prompt: string) {
  return /(?:위(?:에|의)?\s*(?:것|거|내용|오더|명령|지시|작업|요청)|앞(?:에|의)?\s*(?:것|거|내용|오더|명령|지시|작업|요청)|이전\s*(?:것|거|내용|오더|명령|지시|작업|요청)|방금\s*(?:것|거|내용|오더|명령|지시|작업|요청)|아까\s*(?:것|거|내용|오더|명령|지시|작업|요청)|앞서\s*(?:것|거|내용|오더|명령|지시|작업|요청)|(?:그|이)\s*(?:것|거|오더|명령|지시|작업|요청).{0,20}(?:다시|계속|이어)|다시\s*실행|재실행|계속\s*(?:해|진행)|이어서\s*(?:해|진행))/i.test(prompt);
}

function hasContinuationIntent(prompt: string) {
  return referencesPriorOrder(prompt)
    && /(다시|재실행|계속|이어서|이어|끝내|완료|진행)/i.test(prompt);
}

function assignedProviders(prompt: string, selected?: AIProviderId[]) {
  const selectedIds = selectedMembers(selected);

  const onlyNamed = PROVIDER_MENTIONS
    .filter(({ pattern }) => new RegExp(`${pattern.source}.{0,18}(?:만|only|담당)`, "i").test(prompt))
    .map(({ id }) => id);
  if (onlyNamed.length) return Array.from(new Set(onlyNamed));

  return selectedIds;
}

function reviewOnlyProviders(prompt: string, leads: AIProviderId[], selected?: AIProviderId[]) {
  if (!/(다른|나머지|그\s*외|타)\s*(?:ai|에이아이|모델).{0,25}(?:검토|리뷰|review)\s*만/i.test(prompt)) return [];
  const pool = selectedMembers(selected).length ? selectedMembers(selected) : [...RC_MEMBER_PROVIDER_IDS];
  return pool.filter((id) => !leads.includes(id));
}

function classifyDirect(prompt: string): RcMemberMode {
  if (hasGlobalNoWriteIntent(prompt)) return hasInspectIntent(prompt) || hasMutationTarget(prompt) ? "inspect" : "answer";
  if (hasMutationTarget(prompt) && hasMutationAction(prompt)) return "execute";
  if (hasInspectIntent(prompt)) return "inspect";
  return "answer";
}

function previousActionableOrder(history?: RcMemberHistoryMessage[]) {
  const userMessages = (history || [])
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);

  for (let index = userMessages.length - 1, depth = 0; index >= 0 && depth < 4; index -= 1, depth += 1) {
    const candidate = userMessages[index];
    if (classifyDirect(candidate) !== "answer") return candidate;
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

  if (hasContinuationIntent(current) && !hasGlobalNoWriteIntent(current)) {
    const prior = previousActionableOrder(history);
    if (prior) {
      const priorMode = classifyDirect(prior);
      mode = hasMutationTarget(current) && hasMutationAction(current)
        ? "execute"
        : hasInspectIntent(current)
          ? "inspect"
          : priorMode;
      inheritedProviders = assignedProviders(prior, selected);
      continuedFromPriorOrder = true;
      effectivePrompt = `${prior}\n\nFollow-up instruction: ${current}`;
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
      ? "Explicit repository mutation request; safe-branch development execution is allowed."
      : mode === "inspect"
        ? "Review/inspection request; AI may investigate freely but repository mutation is not requested."
        : "Open answer mode; AI may reason and respond freely without repository mutation.",
  };
}
