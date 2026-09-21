import fs from "node:fs";
import { describe, expect, it } from "vitest";

const snapshotPath = "scripts/supabase-security-advisor-readback-20260922.json";

type Snapshot = {
  source: {
    provider: string;
    queryMode: string;
    hostedMutationPerformed: boolean;
  };
  observedAt: string;
  securityRegression: {
    status: "VERIFIED" | "NEEDS_REVIEW" | "BLOCKED";
    externalFindingFamilies: number;
    findingCount: number;
    findings: Array<{
      name: string;
      level: string;
      facing: string;
      count: number;
      remediation: string;
      classification?: string;
      tablesWithAnonPrivileges?: number;
      tablesWithAuthenticatedPrivileges?: number;
      tablesWithServiceRolePrivileges?: number;
    }>;
    launchCriticalTablesObserved: string[];
    advisorDisposition?: string;
    remainingVerification?: string;
  };
};

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as Snapshot;

describe("Hosted security advisor read-back", () => {
  it("is evidence-only and records no Hosted mutation", () => {
    expect(snapshot.source.provider).toMatch(/^Supabase Security Advisor/);
    expect(snapshot.source.queryMode).toBe("READ_ONLY");
    expect(snapshot.source.hostedMutationPerformed).toBe(false);
  });

  it("keeps release security fail-closed until the exact-head verification boundary is complete", () => {
    expect(snapshot.securityRegression.externalFindingFamilies).toBeGreaterThan(0);
    expect(snapshot.securityRegression.findingCount).toBeGreaterThan(0);
    expect(snapshot.securityRegression.status).not.toBe("VERIFIED");
    expect(snapshot.securityRegression.remainingVerification).toMatch(/exact release-candidate/i);
  });

  it("classifies the current RLS-with-no-policy family using independent privilege read-back", () => {
    expect(snapshot.securityRegression.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "rls_enabled_no_policy",
          facing: "EXTERNAL",
          classification: "REVIEWED_SERVICE_ROLE_ONLY",
          tablesWithAnonPrivileges: 0,
          tablesWithAuthenticatedPrivileges: 0,
          tablesWithServiceRolePrivileges: 19,
        }),
      ]),
    );
    expect(snapshot.securityRegression.advisorDisposition).toMatch(/zero anon\/authenticated table privileges/i);
  });

  it("captures launch-critical first-wave tables implicated by the current RLS finding family", () => {
    expect(snapshot.securityRegression.launchCriticalTablesObserved).toEqual(
      expect.arrayContaining([
        "communication_recording_policies",
        "rc_service_provider_offers",
        "rc_service_providers",
      ]),
    );
  });

  it("records a remediation reference without persisting credentials or customer identifiers", () => {
    expect(snapshot.securityRegression.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "rls_enabled_no_policy",
          facing: "EXTERNAL",
          remediation:
            "https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy",
        }),
      ]),
    );

    const raw = fs.readFileSync(snapshotPath, "utf8");
    expect(raw).not.toMatch(/anon_key|service_role_key|jwt[_-]?secret|password|api[_-]?secret/i);
    expect(raw).not.toMatch(/"owner_id"\s*:|"customer_number"\s*:|"customer_sequence"\s*:/i);
  });
});
