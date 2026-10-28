import { GENERATED_COUNTRY_PACKS, GENERATED_POLICY_PACKS, GENERATED_REGION_PACKS } from "./generated/packRegistry.generated";
import type { CountryPack, PolicyPack, RegionPack } from "./packs/types";

export const countryPackId = (countryCode: string) => `country-${countryCode.trim().toLowerCase()}`;
export const regionPackId = (regionCode: string) => `region-${regionCode.trim().toLowerCase()}`;

export function getCountryPack(packId: string | null | undefined): CountryPack | null {
  return packId ? GENERATED_COUNTRY_PACKS.get(packId) || null : null;
}
export function getRegionPack(packId: string | null | undefined): RegionPack | null {
  return packId ? GENERATED_REGION_PACKS.get(packId) || null : null;
}
export function getPolicyPack(packId: string | null | undefined): PolicyPack | null {
  return packId ? GENERATED_POLICY_PACKS.get(packId) || null : null;
}
export const listCountryPacks = (): readonly CountryPack[] => [...GENERATED_COUNTRY_PACKS.values()];
export const listRegionPacks = (): readonly RegionPack[] => [...GENERATED_REGION_PACKS.values()];
export const listPolicyPacks = (): readonly PolicyPack[] => [...GENERATED_POLICY_PACKS.values()];
