import {
  evaluateFirstWaveCountryOperationalAggregation,
  FIRST_WAVE_COUNTRY_CODES,
  type FirstWaveAggregationBlocker,
  type FirstWaveCountryCode,
  type FirstWaveCountryEvidenceInput,
} from "./firstWaveCountryOperationalAggregation";

export type FirstWaveCountryReleaseReadinessRow = {
  countryCode: FirstWaveCountryCode;
  evaluated: boolean;
  launchable: boolean;
  countryConfigBlockers: string[];
  operationalBlockers: string[];
  evidenceBindingBlockers: string[];
};

export type FirstWaveReleaseReadinessReport = {
  candidateSha: string;
  decision: "READY_FOR_PROMOTION" | "HOLD";
  safeToPromote: boolean;
  aggregationBlockers: FirstWaveAggregationBlocker[];
  countries: FirstWaveCountryReleaseReadinessRow[];
};

/**
 * Build a release-facing, read-only view of the first-wave launch decision.
 *
 * This deliberately delegates all launch authority to the existing country-bound
 * aggregator. It does not activate countries, mutate configuration, deploy, or
 * infer missing evidence. Release tooling can consume this report without
 * reimplementing legal/compliance, Auth/Data Isolation, payment, Room Factory,
 * QA/security, or exact-head provenance rules.
 */
export function buildFirstWaveReleaseReadinessReport(
  expectedExactHeadSha: string,
  inputs: readonly FirstWaveCountryEvidenceInput[],
): FirstWaveReleaseReadinessReport {
  const aggregation = evaluateFirstWaveCountryOperationalAggregation(
    expectedExactHeadSha,
    inputs,
  );

  const countries = FIRST_WAVE_COUNTRY_CODES.map((countryCode) => {
    const gate = aggregation.countryGates[countryCode];

    return {
      countryCode,
      evaluated: Boolean(gate),
      launchable: gate?.launchable === true,
      countryConfigBlockers: gate ? [...gate.countryGate.blockers] : [],
      operationalBlockers: gate ? [...gate.operationalBlockers] : [],
      evidenceBindingBlockers: gate ? [...gate.evidenceBinding.blockers] : [],
    };
  });

  return {
    candidateSha: expectedExactHeadSha.trim(),
    decision: aggregation.launchable ? "READY_FOR_PROMOTION" : "HOLD",
    safeToPromote: aggregation.launchable,
    aggregationBlockers: [...aggregation.blockers],
    countries,
  };
}
