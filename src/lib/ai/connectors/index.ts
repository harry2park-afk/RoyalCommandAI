import { AnthropicConnector } from "./anthropic";
import { DemoConnector } from "./demo";
import { GoogleConnector } from "./google";
import { OpenAIConnector } from "./openai";
import { OpenRouterCatalogConnector } from "./openrouter";
import { PerplexityConnector } from "./perplexity";
import { XAIConnector } from "./xai";
import type { AIConnector, AIProviderId } from "../types";
import { PROVIDER_LABELS } from "../types";
import { AI_CATALOG_BY_ID } from "../catalog";
import { listRegisteredProviderIds } from "../providerRegistry";
import { isDemoMode } from "@/lib/utils";

const nativeConnectors: Partial<Record<AIProviderId, AIConnector>> = {
  openai: new OpenAIConnector(),
  anthropic: new AnthropicConnector(),
  google: new GoogleConnector(),
  xai: new XAIConnector(),
  perplexity: new PerplexityConnector(),
};

const catalogConnectors: Partial<Record<AIProviderId, AIConnector>> = {};

for (const id of listRegisteredProviderIds()) {
  if (nativeConnectors[id]) continue;
  const entry = AI_CATALOG_BY_ID[id];
  if (!entry?.modelQuery) continue;
  catalogConnectors[id] = new OpenRouterCatalogConnector(
    id,
    PROVIDER_LABELS[id],
    entry.modelQuery,
  );
}

// The RCA Room catalog intentionally exposes all 25 provider families. If a
// dedicated Perplexity key is present, prefer the native Sonar connector. When
// it is absent but OpenRouter is configured, the owner's explicit all-AI Room
// configuration allows Perplexity to use the same catalog transport as the
// other OpenRouter-backed providers. The provider identity remains Perplexity.
const perplexityOpenRouterConnector = new OpenRouterCatalogConnector(
  "perplexity",
  PROVIDER_LABELS.perplexity,
  AI_CATALOG_BY_ID.perplexity.modelQuery || "Perplexity",
);

export function getConnector(id: AIProviderId): AIConnector {
  if (id === "perplexity") {
    const native = nativeConnectors.perplexity;
    if (native?.isConfigured()) return native;
    if (perplexityOpenRouterConnector.isConfigured()) return perplexityOpenRouterConnector;
    if (isDemoMode()) return new DemoConnector(id, PROVIDER_LABELS[id]);
    return native || perplexityOpenRouterConnector;
  }

  const real = nativeConnectors[id] || catalogConnectors[id];
  if (!real) return new DemoConnector(id, PROVIDER_LABELS[id]);
  if (real.isConfigured()) return real;
  if (isDemoMode()) return new DemoConnector(id, PROVIDER_LABELS[id]);
  return real;
}

export function listConnectors(): AIConnector[] {
  return listRegisteredProviderIds().map(getConnector);
}

export function getAvailableProviderIds(): AIProviderId[] {
  return listConnectors()
    .filter((c) => c.isConfigured() || isDemoMode())
    .map((c) => c.id);
}
