import auConfig from "./countries/au.json";
import caConfig from "./countries/ca.json";
import gbConfig from "./countries/gb.json";
import jpConfig from "./countries/jp.json";
import krConfig from "./countries/kr.json";
import usConfig from "./countries/us.json";
import type { CountryConfig } from "../types/countryConfig";
import { getDomainAsset, resolveRuntimeDomain } from "./domainRegistry";

export type CountryCode = string;

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  AU: auConfig as CountryConfig,
  CA: caConfig as CountryConfig,
  GB: gbConfig as CountryConfig,
  JP: jpConfig as CountryConfig,
  KR: krConfig as CountryConfig,
  US: usConfig as CountryConfig,
};

const COUNTRY_OVERRIDES_BY_DOMAIN: Record<string, CountryCode[]> = {
  "atyourcommandai.com": ["CA"],
};

export function hasCountryConfig(countryCode: CountryCode): boolean {
  return Boolean(COUNTRY_CONFIGS[countryCode.trim().toUpperCase()]);
}

export function getConfiguredCountryCodes(): CountryCode[] {
  return Object.keys(COUNTRY_CONFIGS).sort();
}

export function getCountryConfigByCountryCode(
  countryCode: CountryCode,
): CountryConfig | null {
  return COUNTRY_CONFIGS[countryCode.trim().toUpperCase()] || null;
}

export function getCountryCodeByDomain(hostname: string): CountryCode | "GLOBAL" | null {
  const runtime = resolveRuntimeDomain(hostname, "production");
  return runtime.allowed ? runtime.binding : null;
}

export function getCountryConfigByDomain(hostname: string): CountryConfig | null {
  const countryCode = getCountryCodeByDomain(hostname);
  if (!countryCode || countryCode === "GLOBAL") return null;
  return getCountryConfigByCountryCode(countryCode);
}

export function getCountryConfigForRequest(
  hostname: string,
  requestedCountryCode?: CountryCode | null,
): CountryConfig | null {
  const runtime = resolveRuntimeDomain(hostname, "production");
  if (!runtime.allowed || !runtime.binding || runtime.binding === "GLOBAL") return null;

  const requested = requestedCountryCode?.trim().toUpperCase();
  const domain = runtime.asset?.domain || getDomainAsset(hostname)?.domain || "";
  if (
    requested &&
    COUNTRY_OVERRIDES_BY_DOMAIN[domain]?.includes(requested) &&
    hasCountryConfig(requested)
  ) {
    return getCountryConfigByCountryCode(requested);
  }

  return getCountryConfigByCountryCode(runtime.binding);
}

export type DomainRuntimeContext = {
  countryCode: CountryCode | "GLOBAL";
  regionCode: string;
  locale: string;
  currency: string;
  phoneCountryCode: string | null;
  countryPackId: string;
  policyPackId: string;
  country: CountryConfig | null;
};

export function getDomainRuntimeContext(hostname: string, vercelEnv = process.env.VERCEL_ENV): DomainRuntimeContext | null {
  const runtime = resolveRuntimeDomain(hostname, vercelEnv);
  if (!runtime.allowed || !runtime.binding) return null;

  if (runtime.binding === "GLOBAL") {
    return {
      countryCode: "GLOBAL",
      regionCode: runtime.asset?.regionCode || "GLOBAL",
      locale: runtime.asset?.defaultLocale || "en",
      currency: runtime.asset?.currency || "USD",
      phoneCountryCode: null,
      countryPackId: runtime.asset?.countryPackId || "global-core",
      policyPackId: runtime.asset?.policyPackId || "global-core",
      country: null,
    };
  }

  const country = getCountryConfigByCountryCode(runtime.binding);
  if (!country) return null;
  return {
    countryCode: country.countryCode,
    regionCode: runtime.asset?.regionCode || country.countryCode,
    locale: runtime.asset?.defaultLocale || country.locale,
    currency: runtime.asset?.currency || country.currency,
    phoneCountryCode: country.phoneCountryCode,
    countryPackId: runtime.asset?.countryPackId || `country-${country.countryCode.toLowerCase()}`,
    policyPackId: runtime.asset?.policyPackId || `policy-${country.countryCode.toLowerCase()}`,
    country,
  };
}
