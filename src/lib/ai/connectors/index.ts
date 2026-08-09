import { AnthropicConnector } from "./anthropic";
import { DemoConnector } from "./demo";
import { GoogleConnector } from "./google";
import { OpenAIConnector } from "./openai";
import { OpenRouterCatalogConnector } from "./openrouter";
import { XAIConnector } from "./xai";
import type { AIConnector, AIProviderId } from "../types";
import { AI_PROVIDER_IDS, PROVIDER_LABELS } from "../types";
import { AI_CATALOG_BY_ID } from "../catalog";
import { isDemoMode } from "@/lib/utils";

const nativeConnectors: Partial<Record<AIProviderId, AIConnector>> = {
  openai: new OpenAIConnector(),
  anthropic: new AnthropicConnector(),
  google: new GoogleConnector(),
  xai: new XAIConnector(),
};

const catalogConnectors: Partial<Record<AIProviderId, AIConnector>> = {};

for (const id of AI_PROVIDER_IDS) {
  if (nativeConnectors[id]) continue;
  const entry = AI_CATALOG_BY_ID[id];
  if (!entry?.modelQuery) continue;
  catalogConnectors[id] = new OpenRouterCatalogConnector(
    id,
    PROVIDER_LABELS[id],
    entry.modelQuery,
  );
}

export function getConnector(id: AIProviderId): AIConnector {
  const real = nativeConnectors[id] || catalogConnectors[id];
  if (!real) return new DemoConnector(id, PROVIDER_LABELS[id]);
  if (real.isConfigured()) return real;
  if (isDemoMode()) return new DemoConnector(id, PROVIDER_LABELS[id]);
  return real;
}

export function listConnectors(): AIConnector[] {
  return AI_PROVIDER_IDS.map(getConnector);
}

export function getAvailableProviderIds(): AIProviderId[] {
  return listConnectors()
    .filter((c) => c.isConfigured() || isDemoMode())
    .map((c) => c.id);
}
