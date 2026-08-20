import auConfig from "./countries/au.json";
import usConfig from "./countries/us.json";
import type { CountryConfig } from "../types/countryConfig";

const DOMAIN_COUNTRY_MAP: Record<string, "AU" | "US" | "GLOBAL"> = {
  "atyourcommandai.com.au": "AU",
  "www.atyourcommandai.com.au": "AU",
  "atyourcommandai.com": "US",
  "www.atyourcommandai.com": "US",
  "royalcommand.ai": "GLOBAL",
  "www.royalcommand.ai": "GLOBAL",
  "royalcommandai.com": "GLOBAL",
  "www.royalcommandai.com": "GLOBAL",
};

export function getCountryConfigByDomain(hostname: string): CountryConfig | null {
  const cleanHostname = hostname.trim().toLowerCase().split(":")[0];
  const countryCode = DOMAIN_COUNTRY_MAP[cleanHostname];

  if (countryCode === "AU") {
    return auConfig as CountryConfig;
  }

  if (countryCode === "US") {
    return usConfig as CountryConfig;
  }

  // Returning null preserves the existing Global Core behavior for global and unknown domains.
  return null;
}
