import { decideDelivery, rankProvider, type DeliveryStrategy, type ProviderCandidate } from "@/lib/rooms/connect-first-policy";

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

export async function resolveServiceProviderV2(
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

  if (typedService.delivery_strategy === "rc_native") {
    return {
      serviceKey: normalizedServiceKey,
      countryCode: normalizedCountry,
      deliveryStrategy: typedService.delivery_strategy,
      buildStatus: typedService.build_status,
      mode: "rc_native",
      provider: null,
    };
  }

  const { data: offers, error: offersError } = await supabase
    .from("rc_service_provider_offers")
    .select("provider_key,commercial_model,ownership_model,api_available,oauth_available,connection_status,active,priority,preferred,provider_fit_score,review_status,currency,customer_price_minor")
    .eq("service_key", normalizedServiceKey)
    .eq("country_code", normalizedCountry)
    .eq("active", true);

  if (offersError) throw offersError;
  const typedOffers = (offers || []) as OfferRow[];

  const decision = decideDelivery(typedService.delivery_strategy, typedOffers.map(toCandidate));
  if (decision.mode !== "connect") {
    return {
      serviceKey: normalizedServiceKey,
      countryCode: normalizedCountry,
      deliveryStrategy: typedService.delivery_strategy,
      buildStatus: typedService.build_status,
      mode: decision.mode,
      provider: null,
    };
  }

  const winningOffer = typedOffers
    .map((offer) => ({ offer, score: rankProvider(toCandidate(offer)) }))
    .filter(({ score }) => score > -100000)
    .sort((a, b) => b.score - a.score)[0]?.offer;

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
