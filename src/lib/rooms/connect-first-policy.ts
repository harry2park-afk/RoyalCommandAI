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

  // A customer-direct supplier is not auto-selected. RC may propose it separately only when
  // RC cannot provide a managed connection for the requested service.
  if (candidate.commercialModel === "customer_direct") return -100000;

  let score = 0;
  if (candidate.reviewStatus === "approved") score += 1000;
  if (candidate.connectionStatus === "available") score += 500;
  if (candidate.apiAvailable) score += 500;
  if (candidate.oauthAvailable) score += 350;
  if (candidate.preferred) score += 100;
  if (candidate.commercialModel === "wholesale") score += 250;
  if (candidate.commercialModel === "rc_resale") score += 220;
  if (candidate.commercialModel === "commission") score += 120;
  if (candidate.commercialModel === "referral") score += 80;
  if (candidate.providerFitScore != null) score += candidate.providerFitScore;
  score -= candidate.priority ?? 100;
  return score;
}

export function decideDelivery(strategy: DeliveryStrategy, providers: ProviderCandidate[]) {
  if (strategy === "rc_native") {
    return { mode: "rc_native" as const, provider: null };
  }

  const viable = providers
    .filter((provider) => rankProvider(provider) > -100000)
    .sort((a, b) => rankProvider(b) - rankProvider(a));

  if (viable.length > 0) {
    return { mode: "connect" as const, provider: viable[0] };
  }

  return {
    mode: strategy === "build_if_needed" || strategy === "connect_first" ? ("build_candidate" as const) : ("unavailable" as const),
    provider: null,
  };
}

export const CONNECT_FIRST_RULES = [
  "Customers choose the capability they want; Royal Command chooses and manages the supplier connection behind the scenes.",
  "Prefer approved wholesale, resale, API or OAuth supplier arrangements that Royal Command can operate for the customer.",
  "Evaluate providers per country because availability, regulation, pricing and partner terms differ.",
  "Keep customer-facing Room UX independent from supplier identity so providers can be changed without rebuilding the Room.",
  "Do not expose supplier cost, RC margin, commission rates or internal supplier-selection logic to customers.",
  "Do not auto-select a customer-direct external supplier. If RC cannot provide the connection, handle that as a separate customer proposal.",
  "Never invent a provider price, discount, commission or supported capability.",
  "Build an RC-native replacement only when there is no suitable supplier or the function is strategically core to Royal Command.",
] as const;
