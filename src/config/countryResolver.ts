import type { CountryConfig, ReviewStatus } from "../types/countryConfig";
import { getDomainAsset, resolveRuntimeDomain } from "./domainRegistry";
import { countryPackId, getCountryPack, getPolicyPack, getRegionPack, listCountryPacks, regionPackId } from "./packRegistry";
import type { CountryPack, PolicyPack, RegionPack } from "./packs/types";

export type CountryCode = string;

const COUNTRY_OVERRIDES_BY_DOMAIN: Record<string, CountryCode[]> = {
  "atyourcommandai.com": ["CA"],
};

export const CORE_CONFIG = {
  countryCode: "GLOBAL" as const,
  regionCode: "GLOBAL",
  locale: "en",
  currency: "USD",
  phoneCountryCode: null as string | null,
  timeZone: "UTC",
};

export type DomainRuntimeContext = {
  hostname: string;
  source: "registry" | "preview" | "development";
  countryCode: CountryCode | "GLOBAL";
  regionCode: string;
  locale: string;
  currency: string;
  phoneCountryCode: string | null;
  timeZone: string;
  countryPackId: string | null;
  regionPackId: string;
  policyPackId: string;
  features: Record<string, ReviewStatus>;
  country: CountryConfig | null;
};

export type PublicDomainRuntimeContext = Omit<DomainRuntimeContext, "country">;

export function toPublicDomainRuntimeContext(context: DomainRuntimeContext): PublicDomainRuntimeContext {
  const { country: _country, ...publicContext } = context;
  return publicContext;
}

export function hasCountryConfig(countryCode: CountryCode): boolean {
  return Boolean(getCountryPack(countryPackId(countryCode)));
}

export function getConfiguredCountryCodes(): CountryCode[] {
  return listCountryPacks().map((pack) => pack.countryCode).sort();
}

export function getCountryConfigByCountryCode(countryCode: CountryCode): CountryConfig | null {
  return getCountryPack(countryPackId(countryCode));
}

export function getCountryCodeByDomain(hostname: string): CountryCode | "GLOBAL" | null {
  const runtime = resolveRuntimeDomain(hostname, "production");
  return runtime.allowed ? runtime.binding : null;
}

export function getCountryConfigByDomain(hostname: string): CountryConfig | null {
  const runtime = resolveRuntimeDomain(hostname, "production");
  if (!runtime.allowed || runtime.binding === "GLOBAL") return null;
  return getCountryPack(runtime.asset?.countryPackId);
}

export function getCountryConfigForRequest(hostname: string, requestedCountryCode?: CountryCode | null): CountryConfig | null {
  const runtime = resolveRuntimeDomain(hostname, "production");
  if (!runtime.allowed || !runtime.binding || runtime.binding === "GLOBAL") return null;
  const requested = requestedCountryCode?.trim().toUpperCase();
  const domain = runtime.asset?.domain || getDomainAsset(hostname)?.domain || "";
  if (requested && COUNTRY_OVERRIDES_BY_DOMAIN[domain]?.includes(requested)) {
    return getCountryPack(countryPackId(requested));
  }
  return getCountryPack(runtime.asset?.countryPackId);
}

function readyRegion(regionCode: string): RegionPack | null {
  const pack = getRegionPack(regionPackId(regionCode));
  return pack?.status === "READY" && pack.regionCode === regionCode ? pack : null;
}

function readyCountry(packId: string | null, binding: string): CountryPack | null {
  if (binding === "GLOBAL") return null;
  const pack = getCountryPack(packId);
  return pack?.status === "READY" && pack.countryCode === binding ? pack : null;
}

function readyPolicy(packId: string | null): PolicyPack | null {
  const pack = getPolicyPack(packId);
  return pack?.status === "READY" ? pack : null;
}

export function getDomainRuntimeContext(hostname: string, vercelEnv = process.env.VERCEL_ENV): DomainRuntimeContext | null {
  const runtime = resolveRuntimeDomain(hostname, vercelEnv);
  if (!runtime.allowed || !runtime.binding || runtime.source === "blocked") return null;

  const regionCode = runtime.asset?.regionCode || "GLOBAL";
  const region = readyRegion(regionCode);
  if (!region) return null;

  const country = readyCountry(runtime.asset?.countryPackId || null, runtime.binding);
  if (runtime.binding !== "GLOBAL" && !country) return null;

  const policyId = runtime.asset?.policyPackId || (runtime.source === "registry" ? null : "policy-global");
  const policy = readyPolicy(policyId);
  if (!policy) return null;

  return {
    hostname: runtime.hostname,
    source: runtime.source,
    countryCode: country?.countryCode || CORE_CONFIG.countryCode,
    regionCode,
    locale: runtime.asset?.defaultLocale || country?.locale || region.locale || CORE_CONFIG.locale,
    currency: runtime.asset?.currency || country?.currency || region.currency || CORE_CONFIG.currency,
    phoneCountryCode: country?.phoneCountryCode ?? region.phoneCountryCode ?? CORE_CONFIG.phoneCountryCode,
    timeZone: country?.timezone.supportedExamples[0] || region.timeZone || CORE_CONFIG.timeZone,
    countryPackId: country?.packId || null,
    regionPackId: region.packId,
    policyPackId: policy.packId,
    features: { ...policy.features },
    country,
  };
}

export function isDomainFeatureReady(context: DomainRuntimeContext, feature: string) {
  return context.features[feature] === "READY";
}
