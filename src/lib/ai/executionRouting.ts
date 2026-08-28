import type { AIProviderId } from "@/lib/ai/types";
import {
  RC_MEMBER_PROVIDER_IDS,
  RC_MEMBER_PROVIDER_NAMES,
  hasGlobalNoWriteIntent,
  resolveRcMemberCommand,
  type RcMemberHistoryMessage,
} from "@/lib/ai/rcMemberLayer";

export const DEV_PROVIDER_IDS = RC_MEMBER_PROVIDER_IDS;
export const DEV_PROVIDER_NAMES = RC_MEMBER_PROVIDER_NAMES;

export function hasExplicitNoExecutionIntent(prompt: string) {
  return hasGlobalNoWriteIntent(prompt);
}

export function shouldRunDeveloperAgent(prompt: string, providers?: AIProviderId[]) {
  const command = resolveRcMemberCommand(prompt, undefined, providers);
  return command.mode === "execute" && command.leadProviders.length > 0;
}

export function resolveDeveloperExecutionPrompt(
  prompt: string,
  history?: RcMemberHistoryMessage[],
  providers?: AIProviderId[],
) {
  const command = resolveRcMemberCommand(prompt, history, providers);
  return command.mode === "execute" && command.leadProviders.length ? command.effectivePrompt : null;
}

export function resolvePromptProviders(prompt: string, selected?: AIProviderId[]) {
  return resolveRcMemberCommand(prompt, undefined, selected).leadProviders;
}

export function chooseDeveloperProvider(prompt: string, providers?: AIProviderId[]) {
  return resolveRcMemberCommand(prompt, undefined, providers).leadProviders[0] || null;
}

export function developerProviderOrder(prompt: string, providers?: AIProviderId[]) {
  return resolveRcMemberCommand(prompt, undefined, providers).leadProviders;
}
