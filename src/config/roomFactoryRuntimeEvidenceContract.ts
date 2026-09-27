import type { CountryConfig } from "../types/countryConfig";

export type RoomFactoryRuntimeEvidence = {
  countryCode: string | null;
  languageTag: string | null;
  manifestId: string | null;
  encounterId: string | null;
};

export type RoomFactoryRuntimeEvidenceBlocker =
  | "COUNTRY_MISMATCH"
  | "LANGUAGE_TAG_MISMATCH"
  | "MANIFEST_ID_MISSING"
  | "ENCOUNTER_ID_MISSING";

export type RoomFactoryRuntimeEvidenceResult = {
  verified: boolean;
  blockers: RoomFactoryRuntimeEvidenceBlocker[];
};

function hasValue(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates the minimum identity contract for Room Factory runtime evidence.
 *
 * This is intentionally evidence-only: it does not create Rooms, query Hosted
 * Supabase, or activate a country. Callers must supply a manifest read from the
 * controlled runtime evidence path. A legacy manifest in the right country but
 * with the wrong language tag (for example AU + ko-KR) is not launch evidence
 * for the configured locale (AU + en-AU).
 */
export function validateRoomFactoryRuntimeEvidence(
  config: CountryConfig,
  evidence: RoomFactoryRuntimeEvidence,
): RoomFactoryRuntimeEvidenceResult {
  const blockers: RoomFactoryRuntimeEvidenceBlocker[] = [];

  if (evidence.countryCode !== config.countryCode) {
    blockers.push("COUNTRY_MISMATCH");
  }

  if (evidence.languageTag !== config.locale) {
    blockers.push("LANGUAGE_TAG_MISMATCH");
  }

  if (!hasValue(evidence.manifestId)) {
    blockers.push("MANIFEST_ID_MISSING");
  }

  if (!hasValue(evidence.encounterId)) {
    blockers.push("ENCOUNTER_ID_MISSING");
  }

  return {
    verified: blockers.length === 0,
    blockers,
  };
}
