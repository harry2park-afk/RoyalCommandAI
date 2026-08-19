import { AI_CATALOG_BY_ID, type AICatalogEntry } from "./catalog";
import { AI_PROVIDER_IDS, PROVIDER_LABELS, type AIProviderId } from "./types";

export type ProviderRegistryEntry = {
  id: AIProviderId;
  displayName: string;
  route: AICatalogEntry["route"];
  modelQuery?: string;
  featured: boolean;
  rank: number;
};

function buildProviderRegistry(): ProviderRegistryEntry[] {
  const seen = new Set<string>();

  return AI_PROVIDER_IDS.map((id) => {
    if (seen.has(id)) throw new Error(`Duplicate AI provider id in registry: ${id}`);
    seen.add(id);

    const catalogEntry = AI_CATALOG_BY_ID[id];
    if (!catalogEntry) {
      throw new Error(`AI provider ${id} is missing from the Royal Command catalog.`);
    }

    return Object.freeze({
      id,
      displayName: PROVIDER_LABELS[id],
      route: catalogEntry.route,
      modelQuery: catalogEntry.modelQuery,
      featured: Boolean(catalogEntry.featured),
      rank: catalogEntry.rank,
    });
  });
}

export const PROVIDER_REGISTRY = Object.freeze(buildProviderRegistry());

const PROVIDER_REGISTRY_BY_ID = new Map<AIProviderId, ProviderRegistryEntry>(
  PROVIDER_REGISTRY.map((entry) => [entry.id, entry]),
);

export function listRegisteredProviderIds(): AIProviderId[] {
  return PROVIDER_REGISTRY.map((entry) => entry.id);
}

export function getProviderRegistryEntry(id: AIProviderId): ProviderRegistryEntry {
  const entry = PROVIDER_REGISTRY_BY_ID.get(id);
  if (!entry) throw new Error(`AI provider ${id} is not registered.`);
  return entry;
}
