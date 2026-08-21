import auConfig from "./countries/au.json";
import caConfig from "./countries/ca.json";
import usConfig from "./countries/us.json";
import type { CountryConfig } from "../types/countryConfig";

export type CountryCode = string;

type DomainBinding = {
  countryCode: CountryCode | "GLOBAL";
  allowedCountryOverrides?: CountryCode[];
};

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  AU: auConfig as CountryConfig,
  CA: caConfig as CountryConfig,
  US: usConfig as CountryConfig,
};

/**
 * Public-domain registry.
 *
 * This is intentionally data-driven so Royal Command can grow toward 100+ country
 * services without adding country-specific branching logic to the resolver.
 * New countries should add their config file to COUNTRY_CONFIGS and their verified
 * domain aliases here only after domain ownership / hosting is confirmed.
 */
const DOMAIN_BINDINGS: Record<string, DomainBinding> = {
  "atyourcommandai.com.au": { countryCode: "AU" },
  "www.atyourcommandai.com.au": { countryCode: "AU" },
  "atyourcommandai.com": { countryCode: "US", allowedCountryOverrides: ["CA"] },
  "www.atyourcommandai.com": { countryCode: "US", allowedCountryOverrides: ["CA"] },
  "royalcommand.ai": { countryCode: "GLOBAL" },
  "www.royalcommand.ai": { countryCode: "GLOBAL" },
  "royalcommandai.com": { countryCode: "GLOBAL" },
  "www.royalcommandai.com": { countryCode: "GLOBAL" },
};

function cleanHostname(hostname: string): string {
  return hostname.trim().toLowerCase().split(":")[0];
}

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
  return DOMAIN_BINDINGS[cleanHostname(hostname)]?.countryCode || null;
}

export function getCountryConfigByDomain(hostname: string): CountryConfig | null {
  const binding = DOMAIN_BINDINGS[cleanHostname(hostname)];
  if (!binding || binding.countryCode === "GLOBAL") return null;
  return getCountryConfigByCountryCode(binding.countryCode);
}

export function getCountryConfigForRequest(
  hostname: string,
  requestedCountryCode?: CountryCode | null,
): CountryConfig | null {
  const binding = DOMAIN_BINDINGS[cleanHostname(hostname)];
  if (!binding || binding.countryCode === "GLOBAL") return null;

  const requested = requestedCountryCode?.trim().toUpperCase();
  if (
    requested &&
    binding.allowedCountryOverrides?.includes(requested) &&
    hasCountryConfig(requested)
  ) {
    return getCountryConfigByCountryCode(requested);
  }

  return getCountryConfigByCountryCode(binding.countryCode);
}
