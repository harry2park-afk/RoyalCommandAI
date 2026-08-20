import auConfig from "./countries/au.json";
import caConfig from "./countries/ca.json";
import usConfig from "./countries/us.json";
import type { CountryConfig } from "../types/countryConfig";

type DomainCountryCode = "AU" | "US" | "GLOBAL";
type RequestCountryCode = "AU" | "US" | "CA";

const DOMAIN_COUNTRY_MAP: Record<string, DomainCountryCode> = {
  "atyourcommandai.com.au": "AU",
  "www.atyourcommandai.com.au": "AU",
  "atyourcommandai.com": "US",
  "www.atyourcommandai.com": "US",
  "royalcommand.ai": "GLOBAL",
  "www.royalcommand.ai": "GLOBAL",
  "royalcommandai.com": "GLOBAL",
  "www.royalcommandai.com": "GLOBAL",
};

const NORTH_AMERICA_DOMAINS = new Set([
  "atyourcommandai.com",
  "www.atyourcommandai.com",
]);

function cleanHostname(hostname: string): string {
  return hostname.trim().toLowerCase().split(":")[0];
}

export function getCountryConfigByCountryCode(
  countryCode: RequestCountryCode,
): CountryConfig {
  if (countryCode === "AU") {
    return auConfig as CountryConfig;
  }

  if (countryCode === "CA") {
    return caConfig as CountryConfig;
  }

  return usConfig as CountryConfig;
}

export function getCountryConfigByDomain(hostname: string): CountryConfig | null {
  const countryCode = DOMAIN_COUNTRY_MAP[cleanHostname(hostname)];

  if (countryCode === "AU") {
    return auConfig as CountryConfig;
  }

  if (countryCode === "US") {
    return usConfig as CountryConfig;
  }

  // Returning null preserves the existing Global Core behavior for global and unknown domains.
  return null;
}

export function getCountryConfigForRequest(
  hostname: string,
  requestedCountryCode?: RequestCountryCode | null,
): CountryConfig | null {
  const hostnameKey = cleanHostname(hostname);

  // The Australian domain always uses the AU configuration.
  if (DOMAIN_COUNTRY_MAP[hostnameKey] === "AU") {
    return auConfig as CountryConfig;
  }

  // US and Canada share the same North America domain. US remains the default;
  // an explicit CA customer/country selection activates the existing Canada config.
  if (NORTH_AMERICA_DOMAINS.has(hostnameKey)) {
    if (requestedCountryCode === "CA") {
      return caConfig as CountryConfig;
    }

    return usConfig as CountryConfig;
  }

  // Global and unknown domains continue to use the existing Global Core behavior.
  return null;
}
