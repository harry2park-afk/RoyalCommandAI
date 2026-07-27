import { AnthropicConnector } from "./anthropic";
import { DemoConnector } from "./demo";
import { GoogleConnector } from "./google";
import { OpenAIConnector } from "./openai";
import { XAIConnector } from "./xai";
import type { AIConnector, AIProviderId } from "../types";
import { PROVIDER_LABELS } from "../types";
import { isDemoMode } from "@/lib/utils";

const realConnectors: AIConnector[] = [
  new OpenAIConnector(),
  new AnthropicConnector(),
  new GoogleConnector(),
  new XAIConnector(),
];

export function getConnector(id: AIProviderId): AIConnector {
  const real = realConnectors.find((c) => c.id === id)!;
  if (real.isConfigured()) return real;
  if (isDemoMode()) return new DemoConnector(id, PROVIDER_LABELS[id]);
  return real;
}

export function listConnectors(): AIConnector[] {
  return (Object.keys(PROVIDER_LABELS) as AIProviderId[]).map(getConnector);
}

export function getAvailableProviderIds(): AIProviderId[] {
  return listConnectors()
    .filter((c) => c.isConfigured() || isDemoMode())
    .map((c) => c.id);
}
