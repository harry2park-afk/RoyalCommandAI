export type DeliveryStrategy = "connect_first" | "build_if_needed" | "rc_native";

export type ProviderCandidate = {
  active: boolean;
  connectionStatus: "research" | "available" | "partner_required" | "manual_only" | "blocked";
  reviewStatus: "unverified" | "researching" | "approved" | "rejected" | "suspended";
  apiAvailable: boolean;
  oauthAvailable: boolean;
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
  if (candidate.apiAvailable) score += 250;
  if (candidate.oauthAvailable) score += 150;
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

  if (viable.length > 0) {
    return { mode: "connect" as const, provider: viable[0] };
  }

  return {
    mode: strategy === "build_if_needed" || strategy === "connect_first" ? ("build_candidate" as const) : ("unavailable" as const),
    provider: null,
  };
}

export const CONNECT_FIRST_RULES = [
  "Prefer a verified external provider before building a duplicate RC feature.",
  "Prefer official API or OAuth connections over fragile manual integrations.",
  "Evaluate providers per country because availability, regulation, pricing and partner terms differ.",
  "Prefer customer-owned accounts when identity or portability matters.",
  "Use resale, wholesale, referral or commission terms only where the supplier contract permits them.",
  "Never invent a provider price, discount, commission or supported capability.",
  "Build an RC-native replacement only when there is no suitable provider or the function is strategically core to Royal Command.",
] as const;
