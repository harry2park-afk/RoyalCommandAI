import { describe, expect, it } from "vitest";
import {
  evaluateHostedSecurityPosture,
  HOSTED_SECURITY_POSTURE_CONTRACT_VERSION,
  HOSTED_SECURITY_SERVICE_ROLE_ONLY_TABLES,
  type HostedSecurityPostureEvidence,
} from "./hostedSecurityPostureGate";
import { ROYAL_COMMAND_HOSTED_PROJECT_REF } from "./hostedLaunchCriticalSnapshotGate";

const EXACT_HEAD = "38151cd13a7c9c779aeda14c12eae5541970a42c";
const EVALUATED_AT = "2026-09-13T00:10:00Z";

function verifiedEvidence(): HostedSecurityPostureEvidence {
  return {
    contractVersion: HOSTED_SECURITY_POSTURE_CONTRACT_VERSION,
    evidenceId: "hosted-security-posture-001",
    exactHeadSha: EXACT_HEAD,
    capturedAtUtc: "2026-09-13T00:00:00Z",
    projectRef: ROYAL_COMMAND_HOSTED_PROJECT_REF,
    serviceRoleOnlyCatalog: HOSTED_SECURITY_SERVICE_ROLE_ONLY_TABLES.map((tableName) => ({
      tableName,
      rlsEnabled: true,
      anonSelect: false,
      anonInsert: false,
      anonUpdate: false,
      anonDelete: false,
      authenticatedSelect: false,
      authenticatedInsert: false,
      authenticatedUpdate: false,
      authenticatedDelete: false,
      serviceRoleSelect: true,
      clientPolicyExists: false,
    })),
    launchCriticalBoundaries: {
      profileRoleClientWriteBlocked: true,
      matterAuthorityClientWriteBlocked: true,
      roomFactoryManifestClientWriteBlocked: true,
    },
    serviceRoleOnlyCatalogReady: true,
    launchCriticalClientWriteBoundariesReady: true,
    databaseSecurityPostureReady: true,
  };
}

describe("Hosted security posture gate", () => {
  it("accepts only exact-head fresh default-deny Hosted evidence", () => {
    const result = evaluateHostedSecurityPosture(EXACT_HEAD, verifiedEvidence(), EVALUATED_AT);

    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.ageMinutes).toBe(10);
  });

  it("does not treat RLS-enabled/no-policy as sufficient without zero client ACL", () => {
    const evidence = verifiedEvidence();
    evidence.serviceRoleOnlyCatalog = evidence.serviceRoleOnlyCatalog.map((row) =>
      row.tableName === "rc_service_provider_offers"
        ? { ...row, authenticatedSelect: true }
        : row,
    );

    const result = evaluateHostedSecurityPosture(EXACT_HEAD, evidence, EVALUATED_AT);

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("HOSTED_SECURITY_CATALOG_DEFAULT_DENY_UNSAFE");
  });

  it("fails closed if a launch-critical client write boundary remains open", () => {
    const evidence = verifiedEvidence();
    evidence.launchCriticalBoundaries.profileRoleClientWriteBlocked = false;
    evidence.launchCriticalClientWriteBoundariesReady = false;
    evidence.databaseSecurityPostureReady = false;

    const result = evaluateHostedSecurityPosture(EXACT_HEAD, evidence, EVALUATED_AT);

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "HOSTED_SECURITY_CLIENT_WRITE_BOUNDARY_UNSAFE",
        "HOSTED_SECURITY_POSTURE_AGGREGATE_NOT_READY",
      ]),
    );
  });

  it("fails closed on missing/duplicate/unsupported catalog coverage", () => {
    const evidence = verifiedEvidence();
    evidence.serviceRoleOnlyCatalog = [
      evidence.serviceRoleOnlyCatalog[0],
      evidence.serviceRoleOnlyCatalog[0],
      { ...evidence.serviceRoleOnlyCatalog[1], tableName: "unexpected_table" },
    ];

    const result = evaluateHostedSecurityPosture(EXACT_HEAD, evidence, EVALUATED_AT);

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "HOSTED_SECURITY_CATALOG_DUPLICATE",
        "HOSTED_SECURITY_CATALOG_UNSUPPORTED",
        "HOSTED_SECURITY_CATALOG_COVERAGE_INCOMPLETE",
      ]),
    );
  });

  it("binds posture evidence to the exact SHA, project and freshness window", () => {
    const evidence = verifiedEvidence();
    evidence.exactHeadSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    evidence.projectRef = "wrong-project";
    evidence.capturedAtUtc = "2026-09-12T22:00:00Z";

    const result = evaluateHostedSecurityPosture(EXACT_HEAD, evidence, EVALUATED_AT);

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "HOSTED_SECURITY_POSTURE_HEAD_SHA_MISMATCH",
        "HOSTED_SECURITY_POSTURE_PROJECT_REF_MISMATCH",
        "HOSTED_SECURITY_POSTURE_STALE",
      ]),
    );
  });

  it("fails closed when evidence is missing", () => {
    expect(evaluateHostedSecurityPosture(EXACT_HEAD, undefined, EVALUATED_AT)).toEqual({
      ready: false,
      blockers: ["HOSTED_SECURITY_POSTURE_MISSING"],
      ageMinutes: null,
    });
  });
});
