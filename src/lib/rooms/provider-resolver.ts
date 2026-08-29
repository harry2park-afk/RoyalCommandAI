import { decideDelivery, type DeliveryStrategy, type ProviderCandidate } from "@/lib/rooms/connect-first-policy";

type ServiceRow = {
  service_key: string;
  delivery_strategy: DeliveryStrategy;
  build_status: string;
  active: boolean;
};

type OfferRow = {
  provider_key: string;
  commercial_model: ProviderCandidate["commercialModel"];
  ownership_model: string;
  api_available: boolean;
  oauth_available: boolean;
  connection_status: ProviderCandidate["connectionStatus"];
  active: boolean;
  priority: number;
  preferred: boolean;
  provider_fit_score: number | null;
  review_status: ProviderCandidate["reviewStatus"];
  currency: string;
  customer_price_minor: number | null;
};

type ProviderRow = {
  provider_key: string;
  provider_name: string;
  website_url: string | null;
  active: boolean;
};

export type SafeResolvedProvider = {
  providerKey: string;
  providerName: string;
  websiteUrl: string | null;
  commercialModel: OfferRow["commercial_model"];
  ownershipModel: string;
  apiAvailable: boolean;
  oauthAvailable: boolean;
  connectionStatus: OfferRow["connection_status"];
  currency: string;
  customerPriceMinor: number | null;
};

export type ProviderResolution = {
  serviceKey: string;
  countryCode: string;
  deliveryStrategy: DeliveryStrategy;
  buildStatus: string;
  mode: "connect" | "rc_native" | "build_candidate" | "unavailable";
  provider: SafeResolvedProvider | null;
};

function toCandidate(row: OfferRow): ProviderCandidate {
  return {
    active: row.active,
    connectionStatus: row.connection_status,
    reviewStatus: row.review_status,
    apiAvailable: row.api_available,
    oauthAvailable: row.oauth_available,
    preferred: row.preferred,
    priority: row.priority,
    providerFitScore: row.provider_fit_score,
    commercialModel: row.commercial_model,
  };
}

export async function resolveServiceProvider(
  supabase: any,
  serviceKey: string,
  countryCode: string,
): Promise<ProviderResolution | null> {
  const normalizedServiceKey = serviceKey.trim();
  const normalizedCountry = countryCode.trim().toUpperCase();

  const { data: service, error: serviceError } = await supabase
    .from("rc_service_catalog")
    .select("service_key,delivery_strategy,build_status,active")
    .eq("service_key", normalizedServiceKey)
    .maybeSingle();

  if (serviceError) throw serviceError;
  if (!service || !service.active) return null;

  const typedService = service as ServiceRow;

  const { data: offers, error: offersError } = await supabase
    .from("rc_service_provider_offers")
    .select("provider_key,commercial_model,ownership_model,api_available,oauth_available,connection_status,active,priority,preferred,provider_fit_score,review_status,currency,customer_price_minor")
    .eq("service_key", normalizedServiceKey)
    .eq("country_code", normalizedCountry)
    .eq("active", true);

  if (offersError) throw offersError;

  const typedOffers = (offers || []) as OfferRow[];
  const decision = decideDelivery(typedService.delivery_strategy, typedOffers.map(toCandidate));

  if (decision.mode !== "connect" || !decision.provider) {
    return {
      serviceKey: normalizedServiceKey,
      countryCode: normalizedCountry,
      deliveryStrategy: typedService.delivery_strategy,
      buildStatus: typedService.build_status,
      mode: decision.mode,
      provider: null,
    };
  }

  const winningIndex = typedOffers.findIndex((offer) => toCandidate(offer) === decision.provider);
  // `decideDelivery` receives new candidate objects, so identity is not stable. Re-rank here to
  // deterministically locate the same highest-ranked offer without exposing internal pricing.
  const ranked = typedOffers
    .map((offer) => ({ offer, candidate: toCandidate(offer) }))
    .filter(({ candidate }) => decideDelivery("connect_first", [candidate]).mode === "connect")
    .sort((a, b) => {
      const aDecision = decideDelivery("connect_first", [a.candidate]);
      const bDecision = decideDelivery("connect_first", [b.candidate]);
      const scoreA = aDecision.mode === "connect" ? 1 : 0;
      const scoreB = bDecision.mode === "connect" ? 1 : 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      if (a.offer.preferred !== b.offer.preferred) return a.offer.preferred ? -1 : 1;
      if ((a.offer.provider_fit_score ?? -1) !== (b.offer.provider_fit_score ?? -1)) return (b.offer.provider_fit_score ?? -1) - (a.offer.provider_fit_score ?? -1);
      return a.offer.priority - b.offer.priority;
    });

  const winningOffer = winningIndex >= 0 ? typedOffers[winningIndex] : ranked[0]?.offer;
  if (!winningOffer) {
    return {
      serviceKey: normalizedServiceKey,
      countryCode: normalizedCountry,
      deliveryStrategy: typedService.delivery_strategy,
      buildStatus: typedService.build_status,
      mode: "build_candidate",
      provider: null,
    };
  }

  const { data: provider, error: providerError } = await supabase
    .from("rc_service_providers")
    .select("provider_key,provider_name,website_url,active")
    .eq("provider_key", winningOffer.provider_key)
    .maybeSingle();

  if (providerError) throw providerError;
  const typedProvider = provider as ProviderRow | null;
  if (!typedProvider?.active) {
    return {
      serviceKey: normalizedServiceKey,
      countryCode: normalizedCountry,
      deliveryStrategy: typedService.delivery_strategy,
      buildStatus: typedService.build_status,
      mode: "build_candidate",
      provider: null,
    };
  }

  return {
    serviceKey: normalizedServiceKey,
    countryCode: normalizedCountry,
    deliveryStrategy: typedService.delivery_strategy,
    buildStatus: typedService.build_status,
    mode: "connect",
    provider: {
      providerKey: typedProvider.provider_key,
      providerName: typedProvider.provider_name,
      websiteUrl: typedProvider.website_url,
      commercialModel: winningOffer.commercial_model,
      ownershipModel: winningOffer.ownership_model,
      apiAvailable: winningOffer.api_available,
      oauthAvailable: winningOffer.oauth_available,
      connectionStatus: winningOffer.connection_status,
      currency: winningOffer.currency,
      customerPriceMinor: winningOffer.customer_price_minor,
    },
  };
}
