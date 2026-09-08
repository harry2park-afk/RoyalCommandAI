import { AUSTRALIA_COUNTRY_PACK } from "./australia";
import { CANADA_COUNTRY_PACK } from "./canada";
import { JAPAN_COUNTRY_PACK } from "./japan";
import { SOUTH_KOREA_COUNTRY_PACK } from "./south-korea";
import { UNITED_KINGDOM_COUNTRY_PACK } from "./united-kingdom";
import { UNITED_STATES_COUNTRY_PACK } from "./united-states";

/**
 * Repository-level Room Factory preparation for the first October rollout wave.
 *
 * Presence in this registry is not launch activation and does not imply legal,
 * privacy, recording, tax, payment, provider, data-residency, or deployment
 * approval. Country promotion remains controlled by the fail-closed launch gate.
 */
export const FIRST_WAVE_COUNTRY_ROOM_PACKS = [
  AUSTRALIA_COUNTRY_PACK,
  UNITED_STATES_COUNTRY_PACK,
  CANADA_COUNTRY_PACK,
  SOUTH_KOREA_COUNTRY_PACK,
  JAPAN_COUNTRY_PACK,
  UNITED_KINGDOM_COUNTRY_PACK,
] as const;

export type FirstWaveCountryRoomPack = (typeof FIRST_WAVE_COUNTRY_ROOM_PACKS)[number];
export type FirstWaveCountryRoomPackId = FirstWaveCountryRoomPack["id"];

export function getFirstWaveCountryRoomPack(
  countryCode: string,
): FirstWaveCountryRoomPack | null {
  return (
    FIRST_WAVE_COUNTRY_ROOM_PACKS.find((pack) => pack.id === countryCode) ?? null
  );
}

export {
  AUSTRALIA_COUNTRY_PACK,
  CANADA_COUNTRY_PACK,
  JAPAN_COUNTRY_PACK,
  SOUTH_KOREA_COUNTRY_PACK,
  UNITED_KINGDOM_COUNTRY_PACK,
  UNITED_STATES_COUNTRY_PACK,
};
