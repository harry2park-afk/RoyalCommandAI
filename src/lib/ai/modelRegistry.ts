import { getProviderRegistryEntry } from "./providerRegistry";
import type { AIProviderId } from "./types";

/**
 * Stable Royal Command model identifier.
 *
 * This ID belongs to Royal Command and is intentionally separate from the
 * model string sent to a provider API. Provider API model names may change
 * without forcing stored Royal Command model IDs to change.
 */
export type AIModelId = `${AIProviderId}:${string}`;

export type AIModelCapabilities = {
  supportsChat: boolean;
  supportsStreaming: boolean | null;
  supportsVision: boolean | null;
  supportsTools: boolean | null;
};

export type AIModelTransport =
  | { type: "native"; apiModelId: string }
  | { type: "openrouter"; apiModelId?: string; modelQuery?: string };

export type AIModelRegistryEntry = {
  id: AIModelId;
  providerId: AIProviderId;
  displayName: string;
  enabled: boolean;
  capabilities: AIModelCapabilities;
  transports: readonly AIModelTransport[];
};

const CHAT_ONLY_CAPABILITIES: AIModelCapabilities = Object.freeze({
  supportsChat: true,
  supportsStreaming: null,
  supportsVision: null,
  supportsTools: null,
});

const MODEL_DEFINITIONS: readonly AIModelRegistryEntry[] = [
  {
    id: "openai:gpt-5.6-sol",
    providerId: "openai",
    displayName: "GPT-5.6 Sol",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [{ type: "native", apiModelId: "gpt-5.6-sol" }],
  },
  {
    id: "openai:gpt-5.6-terra",
    providerId: "openai",
    displayName: "GPT-5.6 Terra",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [{ type: "native", apiModelId: "gpt-5.6-terra" }],
  },
  {
    id: "openai:gpt-5.6-luna",
    providerId: "openai",
    displayName: "GPT-5.6 Luna",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [{ type: "native", apiModelId: "gpt-5.6-luna" }],
  },
  {
    id: "openai:gpt-4.1-mini",
    providerId: "openai",
    displayName: "GPT-4.1 mini",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [
      { type: "native", apiModelId: "gpt-4.1-mini" },
      { type: "openrouter", apiModelId: "openai/gpt-4.1-mini" },
    ],
  },
  {
    id: "openai:gpt-4o-mini",
    providerId: "openai",
    displayName: "GPT-4o mini",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [{ type: "native", apiModelId: "gpt-4o-mini" }],
  },
  {
    id: "anthropic:claude-haiku-4-5",
    providerId: "anthropic",
    displayName: "Claude Haiku 4.5",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [
      { type: "native", apiModelId: "claude-haiku-4-5" },
      { type: "openrouter", modelQuery: "anthropic claude" },
    ],
  },
  {
    id: "google:gemini-3.7-flash",
    providerId: "google",
    displayName: "Gemini 3.7 Flash",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [{ type: "native", apiModelId: "gemini-3.7-flash" }],
  },
  {
    id: "google:gemini-3.6-flash",
    providerId: "google",
    displayName: "Gemini 3.6 Flash",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [
      { type: "native", apiModelId: "gemini-3.6-flash" },
      { type: "openrouter", modelQuery: "google gemini flash" },
    ],
  },
  {
    id: "google:gemini-3.5-flash-lite",
    providerId: "google",
    displayName: "Gemini 3.5 Flash Lite",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [{ type: "native", apiModelId: "gemini-3.5-flash-lite" }],
  },
  {
    id: "xai:grok-4.5",
    providerId: "xai",
    displayName: "Grok 4.5",
    enabled: true,
    capabilities: CHAT_ONLY_CAPABILITIES,
    transports: [{ type: "native", apiModelId: "grok-4.5" }],
  },
  {
    id: "perplexity:sonar-pro",
    providerId: "perplexity",
    displayName: "Sonar Pro",
    enabled: true,
    capabilities: Object.freeze({
      supportsChat: true,
      supportsStreaming: true,
      supportsVision: null,
      supportsTools: null,
    }),
    transports: [
      { type: "native", apiModelId: "sonar-pro" },
      { type: "openrouter", modelQuery: "Perplexity Sonar Pro" },
    ],
  },
  {
    id: "codex:gpt-5.3-codex",
    providerId: "codex",
    displayName: "GPT-5.3-Codex",
    enabled: true,
    capabilities: Object.freeze({
      supportsChat: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsTools: true,
    }),
    transports: [{ type: "native", apiModelId: "gpt-5.3-codex" }],
  },
] as const;

function buildModelRegistry() {
  const byId = new Map<AIModelId, AIModelRegistryEntry>();
  for (const definition of MODEL_DEFINITIONS) {
    getProviderRegistryEntry(definition.providerId);
    if (byId.has(definition.id)) throw new Error(`Duplicate AI model id in registry: ${definition.id}`);
    if (!definition.transports.length) throw new Error(`AI model ${definition.id} has no transport.`);
    byId.set(definition.id, Object.freeze({
      ...definition,
      capabilities: Object.freeze({ ...definition.capabilities }),
      transports: Object.freeze(definition.transports.map((transport) => Object.freeze({ ...transport }))),
    }));
  }
  return byId;
}

const MODEL_REGISTRY_BY_ID = buildModelRegistry();
export const AI_MODEL_REGISTRY = Object.freeze(Array.from(MODEL_REGISTRY_BY_ID.values()));

export function getModelRegistryEntry(id: AIModelId): AIModelRegistryEntry {
  const entry = MODEL_REGISTRY_BY_ID.get(id);
  if (!entry) throw new Error(`AI model ${id} is not registered.`);
  return entry;
}

export function listModelsByProvider(providerId: AIProviderId): AIModelRegistryEntry[] {
  return AI_MODEL_REGISTRY.filter((entry) => entry.providerId === providerId);
}

export function listEnabledModels(): AIModelRegistryEntry[] {
  return AI_MODEL_REGISTRY.filter((entry) => entry.enabled);
}
