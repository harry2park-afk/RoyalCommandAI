import { getConnector } from "./connectors";
import { getModelRegistryEntry, type AIModelId } from "./modelRegistry";
import { getProviderRegistryEntry } from "./providerRegistry";
import type { AIProviderId, AIProviderResponse, AIRequest } from "./types";

export type AIModelExecutionBinding = {
  modelId: AIModelId;
  providerId: AIProviderId;
  transport: "native" | "openrouter";
  apiModelId: string;
};

/**
 * Resolve an explicit Royal Command model selection into the exact execution
 * target already supported by the current Provider Registry route.
 *
 * Phase 4 never silently substitutes another model. If the selected model
 * cannot be executed exactly through the provider's current route, resolution
 * fails locally before any provider API call is made.
 */
export function resolveModelExecutionBinding(
  providerId: AIProviderId,
  modelId: AIModelId,
): AIModelExecutionBinding {
  const model = getModelRegistryEntry(modelId);
  if (!model.enabled) throw new Error(`AI model ${modelId} is disabled.`);
  if (model.providerId !== providerId) {
    throw new Error(`AI model ${modelId} belongs to ${model.providerId}, not ${providerId}.`);
  }

  const provider = getProviderRegistryEntry(providerId);
  const transport = model.transports.find(
    (candidate) => candidate.type === provider.route && Boolean(candidate.apiModelId?.trim()),
  );

  if (!transport?.apiModelId?.trim()) {
    throw new Error(
      `AI model ${modelId} has no exact ${provider.route} execution target for provider ${providerId}.`,
    );
  }

  return Object.freeze({
    modelId,
    providerId,
    transport: transport.type,
    apiModelId: transport.apiModelId.trim(),
  });
}

export async function executeModelBinding(
  binding: AIModelExecutionBinding,
  request: AIRequest,
): Promise<AIProviderResponse> {
  const connector = getConnector(binding.providerId);
  return connector.complete({
    ...request,
    model: binding.apiModelId,
  });
}
