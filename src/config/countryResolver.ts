import usConfig from "./countries/us.json";
import type { CountryConfig } from "../types/countryConfig";

const DOMAIN_COUNTRY_MAP: Record<string, "US" | "GLOBAL"> = {
  "atyourcommandai.com": "US",
  "www.atyourcommandai.com": "US",
  "royalcommand.ai": "GLOBAL",
  "www.royalcommand.ai": "GLOBAL",
};

export function getCountryConfigByDomain(hostname: string): CountryConfig | null {
  const cleanHostname = hostname.trim().toLowerCase().split(":")[0];
  const countryCode = DOMAIN_COUNTRY_MAP[cleanHostname];

  if (countryCode === "US") {
    return usConfig as CountryConfig;
  }

  // Returning null preserves the existing Global Core behavior for all other domains.
  return null;
}
