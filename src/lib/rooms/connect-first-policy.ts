export type DeliveryStrategy = "connect_first" | "build_if_needed" | "rc_native";
export type DeliverySurface = "rc_embedded" | "rc_managed" | "external_fallback" | "research";

export type ProviderCandidate = {
  active: boolean;
  connectionStatus: "research" | "available" | "partner_required" | "manual_only" | "blocked";
  reviewStatus: "unverified" | "researching" | "approved" | "rejected" | "suspended";
  apiAvailable: boolean;
  oauthAvailable: boolean;
  deliverySurface?: DeliverySurface;
  preferred?: boolean;
  priority?: number;
  providerFitScore?: number | null;
  commercialModel: "customer_direct" | "rc_resale" | "wholesale" | "referral" | "commission" | "custom_quote";
};

export const DEFAULT_DELIVERY_STRATEGY: DeliveryStrategy = "connect_first";

export function rankProvider(candidate: ProviderCandidate) {
  if (!candidate.active || candidate.connectionStatus === "blocked" || candidate.reviewStatus === "rejected" || candidate.reviewStatus === "suspended") {
    return -100000;
  }

  let score = 0;
  if (candidate.reviewStatus === "approved") score += 1000;
  if (candidate.connectionStatus === "available") score += 500;

  // Royal Command should be the customer-facing operating surface whenever possible.
  if (candidate.deliverySurface === "rc_embedded") score += 3000;
  if (candidate.deliverySurface === "rc_managed") score += 2000;
  if (candidate.deliverySurface === "research" || candidate.deliverySurface == null) score += 0;
  if (candidate.deliverySurface === "external_fallback") score -= 2500;

  if (candidate.apiAvailable) score += 500;
  if (candidate.oauthAvailable) score += 350;
  if (candidate.preferred) score += 100;
  if (candidate.commercialModel === "wholesale" || candidate.commercialModel === "rc_resale") score += 80;
  if (candidate.commercialModel === "commission" || candidate.commercialModel === "referral") score += 50;
  if (candidate.providerFitScore != null) score += candidate.providerFitScore;
  score -= candidate.priority ?? 100;
  return score;
}

export function decideDelivery(strategy: DeliveryStrategy, providers: ProviderCandidate[]) {
  const viable = providers.filter((provider) => rankProvider(provider) > -100000).sort((a, b) => rankProvider(b) - rankProvider(a));

  if (strategy === "rc_native") {
    return { mode: "rc_native" as const, provider: null };
  }

  // Prefer a provider that can operate through RC before considering an external fallback.
  const rcOperated = viable.filter((provider) => provider.deliverySurface === "rc_embedded" || provider.deliverySurface === "rc_managed");
  if (rcOperated.length > 0) {
    return { mode: "connect" as const, provider: rcOperated[0] };
  }

  const researchOrLegacy = viable.filter((provider) => provider.deliverySurface == null || provider.deliverySurface === "research");
  if (researchOrLegacy.length > 0) {
    return { mode: "connect" as const, provider: researchOrLegacy[0] };
  }

  const externalFallback = viable.filter((provider) => provider.deliverySurface === "external_fallback");
  if (externalFallback.length > 0) {
    return { mode: "connect" as const, provider: externalFallback[0] };
  }

  return {
    mode: strategy === "build_if_needed" || strategy === "connect_first" ? ("build_candidate" as const) : ("unavailable" as const),
    provider: null,
  };
}

export const CONNECT_FIRST_RULES = [
  "Royal Command should remain the customer-facing operating surface whenever technically and contractually possible.",
  "Prefer RC-embedded or RC-managed integrations over sending the customer to an external supplier site.",
  "Prefer official API or OAuth connections so supplier capabilities can operate inside the Room.",
  "A customer-owned supplier account may still be RC-managed when identity, portability or supplier rules require the account to remain in the customer's name.",
  "Use direct external supplier access only as a last-resort fallback when RC cannot safely or lawfully provide the workflow inside Royal Command.",
  "Evaluate providers per country because availability, regulation, pricing and partner terms differ.",
  "Use resale, wholesale, referral or commission terms only where the supplier contract permits them.",
  "Never invent a provider price, discount, commission or supported capability.",
  "Build an RC-native replacement only when there is no suitable provider or the function is strategically core to Royal Command.",
] as const;
