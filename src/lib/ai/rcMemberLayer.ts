import type { AIProviderId } from "@/lib/ai/types";

export const RC_MEMBER_PROVIDER_IDS = ["openai", "anthropic", "google", "xai", "codex"] as const satisfies readonly AIProviderId[];

export const RC_MEMBER_PROVIDER_NAMES: Partial<Record<AIProviderId, string>> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  xai: "Grok",
  codex: "Codex",
};

export const RC_MEMBER_PROVIDER_ROLES: Partial<Record<AIProviderId, string>> = {
  openai: "Controller / Final Integrator — understand the user's order, keep scope aligned, reconcile findings, and state the final decision clearly.",
  anthropic: "Architecture / UX Reviewer — protect system structure, maintainability, safety boundaries, and operator usability.",
  google: "Global / Product Reviewer — check multilingual, multi-country, product simplicity, and practical user experience.",
  xai: "Red-Team Reviewer — search for regressions, hidden conflicts, failure modes, performance risks, and unsupported claims.",
  codex: "Implementation Specialist — inspect repository evidence, make the smallest coherent code change when selected as Writer, and return verifiable implementation evidence.",
};

export const RCA_OPERATING_PROTOCOL = [
  "ROYAL COMMAND RCA COMMON OPERATING PROTOCOL — HOST PROVIDED",
  "Current user order is authoritative. Use prior history only when needed to understand the current order and never let an older instruction override a conflicting current instruction.",
  "RC Command Center is the user's single operational workspace. Do not instruct the user to split the same task across separate AI browser tabs unless an external account action genuinely requires it.",
  "Use the fixed five-member review specialties without making any provider a permanent Writer.",
  "Strictly separate REVIEW/INSPECT from EXECUTE. Review, analysis, verification, diagnosis, status questions, and safety checks are read-only and must not modify code, GitHub, Vercel, Production, branches, PRs, or files.",
  "Words such as GitHub, commit, push, merge, Vercel, deploy, Production, Preview, code, file, API, or branch are not execution authorization by themselves.",
  "Repository mutation requires an explicit current instruction to modify, implement, apply, commit, push, merge, deploy, or otherwise execute a change.",
  "For execution, Single Write Authority is strict per conflicting resource: the first selected provider is the Writer and other selected providers are review-only unless the user explicitly assigns a different Writer.",
  "RESTORE-FIRST is mandatory for regressions and previously-working features: identify the last known-good commit/preview, compare the diff, identify the single owner, restore when possible, and only then consider a minimal owner-file change.",
  "STRICT NO-ADD is the default: do not add a new Bridge, overlay, patch JS, MutationObserver, duplicate component, or fallback writer merely because the first fix failed. If the owner cannot be safely restored or minimally corrected, stop and report BLOCKED with evidence.",
  "Do not add avoidable sequential AI waits. Independent review work should run in parallel when the execution path supports it.",
  "Before execution, preserve current working behavior and verify the relevant Production state, master/base SHA, target branch or PR, target files, restore point, and likely impact when host evidence is available.",
  "Make the smallest coherent change that satisfies the current order. Do not broaden scope into unrelated UI, data, auth, billing, other Rooms, or Production behavior.",
  "Never report SUCCESS without host-verifiable evidence appropriate to the task, such as changed files, commit SHA, CI results, Preview status, and Production READY when Production deployment is actually part of the order.",
  "For deployment incidents, distinguish build failure from post-build deploy/finalization failure. If Production is READY, do not disturb Production merely because a Preview is stuck or failed.",
  "Do not repeat the same failing action indefinitely. Inspect logs and evidence, identify the failure stage, then choose the next bounded action.",
  "If the current order is ambiguous between review and execution, remain read-only and report the ambiguity instead of writing or deploying.",
].join("\n");

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

function executionAssignment(selectedIds: AIProviderId[], preferExplicitCodex: boolean) {
  const writer = preferExplicitCodex && selectedIds.includes("codex") ? "codex" : selectedIds[0];
  if (!writer) return { leadProviders: [] as AIProviderId[], reviewOnlyProviders: [] as AIProviderId[] };
  return {
    leadProviders: [writer],
    reviewOnlyProviders: selectedIds.filter((id) => id !== writer),
  };
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

function hasExplicitCodexExecuteMarker(prompt: string) {
  const codex = /(?:codex|코덱스)/i.test(prompt);
  const executeMarker = /(?:\bEXECUTE\b|실제\s*EXECUTE|실행\s*(?:작업|요청|테스트|모드|단계)|실제로\s*(?:구현|수정|적용|실행))/i.test(prompt);
  const writerOrMutation = /(?:single\s*writer|sole\s*writer|writer|단일\s*writer|단독\s*(?:수정|작성|구현)|파일\s*(?:생성|수정|작성)|코드\s*(?:수정|작성|구현)|branch|commit|브랜치|커밋)/i.test(prompt);
  return codex && executeMarker && writerOrMutation;
}

/**
 * A Command Center order may intentionally say that reviewers must not write while
 * explicitly authorizing Codex as the only writer. That is not a global no-write
 * instruction. Treat it as execution only when both the Codex writer scope and an
 * affirmative execution/change directive are present in the current order.
 */
function hasRoleScopedExecutionAuthorization(prompt: string) {
  const codexWriter = /(?:codex|코덱스).{0,120}(?:single\s*writer|sole\s*writer|writer|단일\s*writer|단독\s*(?:writer|수정|작성|구현)|실제\s*(?:코드\s*)?(?:수정|작성|구현)|(?:코드|파일|소스).{0,20}(?:수정|작성|구현|write))/i.test(prompt);
  const explicitExecute = /(?:\bEXECUTE\b|실행\s*(?:모드|단계|작업|요청|테스트)|실제로\s*(?:구현|수정|적용|실행)|(?:구현|수정|적용|반영).{0,24}(?:해\s*주세요|하세요|진행))/i.test(prompt);
  return hasExplicitCodexExecuteMarker(prompt) || (codexWriter && (explicitExecute || hasMutationRequest(prompt) || hasExplicitExecutionRequest(prompt)));
}

function hasInspectIntent(prompt: string) {
  return /(검토|검증|점검|조사|분석|진단|원인|inspect|investigate|review|verify|diagnos|analy[sz]e)/i.test(prompt);
}

function hasContinuationIntent(prompt: string) {
  return /(이전|앞의|위의|위에|방금|아까|앞서).{0,20}(작업|요청|지시|내용|오더|명령).{0,20}(계속|이어서|완료|끝내|다시|실행)|(?:위|위에|앞|방금)\s*(?:오더|작업|명령|지시).{0,20}(?:다시|계속|이어서)?\s*(?:실행|진행|완료)|(?:계속|이어서)\s*(?:진행|작업|실행)/i.test(prompt);
}

function classifyDirect(prompt: string): RcMemberMode {
  const roleScopedExecution = hasRoleScopedExecutionAuthorization(prompt);
  if (roleScopedExecution) return "execute";
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

function withOperatingProtocol(mode: RcMemberMode, prompt: string) {
  if (mode === "answer") return prompt;
  return `${RCA_OPERATING_PROTOCOL}\n\nCURRENT USER ORDER:\n${prompt}`;
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

  effectivePrompt = withOperatingProtocol(mode, effectivePrompt);

  const assignment = mode === "execute"
    ? executionAssignment(selectedIds, hasRoleScopedExecutionAuthorization(current))
    : { leadProviders: selectedIds, reviewOnlyProviders: [] as AIProviderId[] };
  const { leadProviders, reviewOnlyProviders } = assignment;

  return {
    mode,
    leadProviders,
    reviewOnlyProviders,
    gitWrite: mode === "execute" && leadProviders.length > 0,
    productionAllowed: false,
    effectivePrompt,
    continuedFromPriorOrder,
    reason: mode === "execute"
      ? leadProviders[0]
        ? `Single Write Authority: ${RC_MEMBER_PROVIDER_NAMES[leadProviders[0]] || leadProviders[0]} is the sole writer for this task; ${reviewOnlyProviders.length} selected AI(s) are review-only. Restore-First and Strict No-Add apply.`
        : "Repository mutation requested, but no selected Writer is available. Execution is BLOCKED."
      : mode === "inspect"
        ? "Review/inspection request; selected AI may investigate in parallel without repository mutation."
        : "Open answer mode; selected AI may reason and respond freely according to the fixed RC member role contract.",
  };
}
