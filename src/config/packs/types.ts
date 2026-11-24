import type { CountryConfig, ReviewStatus } from "@/types/countryConfig";

export type PackStatus = "READY" | "NEEDS_REVIEW" | "BLOCKED";

export type CountryPack = CountryConfig & {
  packId: string;
  status: PackStatus;
};

export type RegionPack = {
  packId: string;
  regionCode: string;
  status: PackStatus;
  locale?: string;
  currency?: string;
  phoneCountryCode?: string | null;
  timeZone?: string;
};

export type PolicyPack = {
  packId: string;
  status: PackStatus;
  features: Record<string, ReviewStatus>;
};
