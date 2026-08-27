import { getAvailableProviderIds } from "@/lib/ai/connectors";
import { getModelRegistryEntry, type AIModelId } from "@/lib/ai/modelRegistry";
import { resolveModelExecutionBinding } from "@/lib/ai/modelExecutionBinding";

export const RCA_INTEGRATOR_MODEL_IDS = [
  "openai:gpt-5.6-sol",
  "openai:gpt-5.6-terra",
  "openai:gpt-5.6-luna",
  "openai:gpt-4.1-mini",
  "openai:gpt-4o-mini",
  "anthropic:claude-haiku-4-5",
  "google:gemini-3.7-flash",
  "google:gemini-3.6-flash",
  "google:gemini-3.5-flash-lite",
  "xai:grok-4.5",
] as const satisfies readonly AIModelId[];

export type RcaIntegratorModelId = (typeof RCA_INTEGRATOR_MODEL_IDS)[number];

export function isRcaIntegratorModelId(value: unknown): value is RcaIntegratorModelId {
  return typeof value === "string" && (RCA_INTEGRATOR_MODEL_IDS as readonly string[]).includes(value);
}

export function listRcaIntegratorModels() {
  const availableProviders = new Set(getAvailableProviderIds());
  return RCA_INTEGRATOR_MODEL_IDS.map((id) => {
    const model = getModelRegistryEntry(id);
    let executable = false;
    try {
      resolveModelExecutionBinding(model.providerId, model.id);
      executable = availableProviders.has(model.providerId);
    } catch {}
    return {
      id: model.id,
      providerId: model.providerId,
      displayName: model.displayName,
      available: executable,
    };
  });
}
