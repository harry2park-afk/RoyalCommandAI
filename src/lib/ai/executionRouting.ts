import type { AIProviderId } from "@/lib/ai/types";

export const DEV_PROVIDER_IDS = ["openai", "anthropic", "google", "xai"] as const satisfies readonly AIProviderId[];

export const DEV_PROVIDER_NAMES: Partial<Record<AIProviderId, string>> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
};

const PROVIDER_MENTIONS: Array<{ id: AIProviderId; pattern: RegExp }> = [
  { id: "openai", pattern: /(chatgpt|openai|챗지피티|챗GPT)/i },
  { id: "anthropic", pattern: /(claude|클로드)/i },
  { id: "google", pattern: /(gemini|제미나이)/i },
  { id: "xai", pattern: /(grok|그록)/i },
];

function hasDevelopmentSubject(prompt: string) {
  return /(코드|개발|버그|오류|ui|화면|레이아웃|사이드바|버튼|기능|파일|github|commit|push|merge|배포|vercel|component|tsx|typescript|css|시스템|라우팅|api|웹사이트|홈페이지|페이지|앱|agent|에이전트)/i.test(prompt);
}

function hasExplicitExecutionIntent(prompt: string) {
  return /(수정해(?:\s*줘|\s*주세요)?|수정하세요|고쳐(?:\s*줘|\s*주세요)?|고치세요|변경해(?:\s*줘|\s*주세요)?|바꿔(?:\s*줘|\s*주세요)?|교체해(?:\s*줘|\s*주세요)?|반영해(?:\s*줘|\s*주세요)?|반영하세요|적용해(?:\s*줘|\s*주세요)?|구현해(?:\s*줘|\s*주세요)?|구현하세요|만들어(?:\s*줘|\s*주세요)?|만드세요|추가해(?:\s*줘|\s*주세요)?|추가하세요|넣어(?:\s*줘|\s*주세요)?|붙여\s*넣어(?:\s*줘|\s*주세요)?|삭제해(?:\s*줘|\s*주세요)?|삭제하세요|제거해(?:\s*줘|\s*주세요)?|배포해(?:\s*줘|\s*주세요)?|배포하세요|실행해(?:\s*줘|\s*주세요)?|실행하세요|작업해(?:\s*줘|\s*주세요)?|작업하세요|일해(?:\s*줘|\s*주세요)?|일하세요|실행\s*담당|실제\s*github\s*개발\s*실행|commit\b|push\b|merge\b|코드를\s*(?:써|작성|변경|수정)|파일을\s*(?:생성|수정|변경|삭제)|실제로\s*(?:수정|변경|구현|배포|실행))/i.test(prompt);
}

function hasWorkContinuation(prompt: string) {
  return /\bRC-\d{8}(?:-[A-Z0-9]+)+\b/i.test(prompt)
    && /(다시\s*실행|재실행|계속|이어(?:서|가기)?|진행|실행(?:해|하세요|해줘|해주세요)?|고쳐|수정(?:해|하세요|해줘|해주세요)?)/i.test(prompt);
}

export function hasExplicitNoExecutionIntent(prompt: string) {
  const directCodeNegation = /(?:코드|파일|ui|화면|레이아웃|component|tsx|typescript|css|기능).{0,28}(?:수정|변경|구현|작성|생성|삭제|제거|적용|반영).{0,18}(?:하지\s*마|하지\s*말|하지\s*않|금지|요청(?:하는\s*것)?이\s*아니|요청하지\s*않)/i.test(prompt)
    || /(?:수정|변경|구현|작성|생성|삭제|제거|적용|반영).{0,18}(?:하지\s*마|하지\s*말|하지\s*않|금지).{0,28}(?:코드|파일|ui|화면|레이아웃|component|tsx|typescript|css|기능)/i.test(prompt);
  const explicitReadOnly = /(읽기\s*전용|read[- ]?only|코드\s*수정\s*없이|수정\s*없이|변경\s*없이|실측\s*확인(?:만)?)/i.test(prompt);
  const executionNegation = /(?:실행|개발\s*(?:agent|에이전트)).{0,22}(?:하지\s*마|하지\s*말|하지\s*않|금지)/i.test(prompt);
  return directCodeNegation || explicitReadOnly || executionNegation;
}

export function shouldRunDeveloperAgent(prompt: string) {
  const positive = (hasDevelopmentSubject(prompt) && hasExplicitExecutionIntent(prompt)) || hasWorkContinuation(prompt);
  if (!positive) return false;

  // A scoped review-only instruction for *other* AIs must not cancel an explicit
  // execution assignment such as "Gemini만 실행 담당, 다른 AI는 검토만".
  const scopedOtherAiReview = /(다른|나머지|타)\s*(?:ai|에이아이|모델).{0,18}(?:검토|리뷰|review)\s*만/i.test(prompt);
  if (scopedOtherAiReview) return true;

  return !hasExplicitNoExecutionIntent(prompt);
}

export function resolvePromptProviders(prompt: string, selected?: AIProviderId[]) {
  const selectedProviders = (selected || []).filter((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number]));
  const asksForAll = /(모두|전부|전체|다 같이|다같이|4\s*ai|four\s+ais?|all\s+(ais?|models?|providers?)|everyone)/i.test(prompt)
    && /(답|말|의견|응답|실행|작업|개발|수정|구현|answer|respond|reply|work|execute|develop)/i.test(prompt);
  if (asksForAll) return selectedProviders.length ? selectedProviders : [...DEV_PROVIDER_IDS];

  const executionAssignment = PROVIDER_MENTIONS
    .filter(({ pattern }) => pattern.test(prompt))
    .filter(({ pattern }) => new RegExp(`${pattern.source}.{0,40}(?:실행\s*담당|실행|개발\s*담당|작업\s*담당|수정\s*담당|구현\s*담당)`, "i").test(prompt))
    .map(({ id }) => id);
  if (executionAssignment.length) return Array.from(new Set(executionAssignment));

  const exclusive = /(만\s*(답|말|응답|의견|해|하세요|해주세요|실행|작업)|only|just\s+(?:have\s+)?|다른\s*(ai|에이아이|모델).*?(말하지|답하지|응답하지|검토만)|나머지.*?(말하지|답하지|응답하지|검토만))/i.test(prompt);
  if (!exclusive) return selectedProviders.length ? selectedProviders : undefined;

  const named = PROVIDER_MENTIONS.filter(({ pattern }) => pattern.test(prompt)).map(({ id }) => id);
  return named.length ? named : (selectedProviders.length ? selectedProviders : undefined);
}

export function chooseDeveloperProvider(prompt: string, providers?: AIProviderId[]) {
  const routed = resolvePromptProviders(prompt, providers)?.filter((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number]));
  return routed?.[0] || providers?.find((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number])) || "openai";
}

export function developerProviderOrder(prompt: string, providers?: AIProviderId[]) {
  const selected = (providers || []).filter((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number]));
  const routed = resolvePromptProviders(prompt, selected)?.filter((id) => DEV_PROVIDER_IDS.includes(id as (typeof DEV_PROVIDER_IDS)[number])) || [];
  const preferred = chooseDeveloperProvider(prompt, selected);
  const pool: AIProviderId[] = routed.length ? routed : (selected.length ? selected : [...DEV_PROVIDER_IDS]);
  return Array.from(new Set([preferred, ...pool, ...DEV_PROVIDER_IDS]));
}
