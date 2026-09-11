import { getCountryConfigByCountryCode } from "./countryResolver";
import {
  evaluateCountryBoundOperationalLaunch,
  type CountryBoundOperationalLaunchGate,
  type CountryOperationalEvidenceEnvelope,
} from "./countryOperationalEvidenceBinding";
import type { CountryOperationalEvidence } from "./countryOperationalLaunchGate";

export const FIRST_WAVE_COUNTRY_CODES = ["AU", "US", "CA", "KR", "JP", "GB"] as const;
export type FirstWaveCountryCode = (typeof FIRST_WAVE_COUNTRY_CODES)[number];

export type FirstWaveCountryEvidenceInput = {
  countryCode: string;
  operationalEvidence: CountryOperationalEvidence;
  envelope: CountryOperationalEvidenceEnvelope | null | undefined;
};

export type FirstWaveAggregationBlocker =
  | { code: "FIRST_WAVE_COUNTRY_MISSING"; countryCode: FirstWaveCountryCode }
  | { code: "FIRST_WAVE_COUNTRY_DUPLICATE"; countryCode: FirstWaveCountryCode }
  | { code: "FIRST_WAVE_COUNTRY_UNSUPPORTED"; countryCode: string }
  | { code: "FIRST_WAVE_COUNTRY_CONFIG_MISSING"; countryCode: FirstWaveCountryCode }
  | { code: "FIRST_WAVE_EVIDENCE_ID_REUSED"; evidenceId: string };

export type FirstWaveCountryOperationalAggregation = {
  launchable: boolean;
  blockers: FirstWaveAggregationBlocker[];
  countryGates: Partial<Record<FirstWaveCountryCode, CountryBoundOperationalLaunchGate>>;
};

const FIRST_WAVE_COUNTRY_SET = new Set<string>(FIRST_WAVE_COUNTRY_CODES);

/**
 * Aggregate the October first-wave country launch gates without allowing evidence
 * coverage to be inferred from another country. The aggregation is intentionally
 * fail-closed: every first-wave country must be present exactly once, evidence IDs
 * cannot be reused across countries, and each country is still evaluated by the
 * full country-bound operational gate for the exact candidate SHA.
 *
 * This helper does not activate countries, change routing, or weaken any existing
 * legal/compliance, payment, Auth/Data Isolation, QA or deployment requirement.
 */
export function evaluateFirstWaveCountryOperationalAggregation(
  expectedExactHeadSha: string,
  inputs: readonly FirstWaveCountryEvidenceInput[],
): FirstWaveCountryOperationalAggregation {
  const blockers: FirstWaveAggregationBlocker[] = [];
  const byCountry = new Map<FirstWaveCountryCode, FirstWaveCountryEvidenceInput>();
  const evidenceIds = new Map<string, FirstWaveCountryCode>();

  for (const input of inputs) {
    const countryCode = input.countryCode.trim().toUpperCase();

    if (!FIRST_WAVE_COUNTRY_SET.has(countryCode)) {
      blockers.push({ code: "FIRST_WAVE_COUNTRY_UNSUPPORTED", countryCode });
      continue;
    }

    const firstWaveCountryCode = countryCode as FirstWaveCountryCode;
    if (byCountry.has(firstWaveCountryCode)) {
      blockers.push({ code: "FIRST_WAVE_COUNTRY_DUPLICATE", countryCode: firstWaveCountryCode });
      continue;
    }

    byCountry.set(firstWaveCountryCode, input);

    const evidenceId = input.envelope?.evidenceId?.trim();
    if (evidenceId) {
      const previousCountry = evidenceIds.get(evidenceId);
      if (previousCountry && previousCountry !== firstWaveCountryCode) {
        blockers.push({ code: "FIRST_WAVE_EVIDENCE_ID_REUSED", evidenceId });
      } else {
        evidenceIds.set(evidenceId, firstWaveCountryCode);
      }
    }
  }

  const countryGates: Partial<
    Record<FirstWaveCountryCode, CountryBoundOperationalLaunchGate>
  > = {};

  for (const countryCode of FIRST_WAVE_COUNTRY_CODES) {
    const input = byCountry.get(countryCode);
    if (!input) {
      blockers.push({ code: "FIRST_WAVE_COUNTRY_MISSING", countryCode });
      continue;
    }

    const config = getCountryConfigByCountryCode(countryCode);
    if (!config) {
      blockers.push({ code: "FIRST_WAVE_COUNTRY_CONFIG_MISSING", countryCode });
      continue;
    }

    countryGates[countryCode] = evaluateCountryBoundOperationalLaunch(
      config,
      input.operationalEvidence,
      expectedExactHeadSha,
      input.envelope,
    );
  }

  const allCountryGatesLaunchable = FIRST_WAVE_COUNTRY_CODES.every(
    (countryCode) => countryGates[countryCode]?.launchable === true,
  );

  return {
    launchable: blockers.length === 0 && allCountryGatesLaunchable,
    blockers,
    countryGates,
  };
}
