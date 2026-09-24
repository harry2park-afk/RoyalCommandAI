import fs from "node:fs";
import { describe, expect, it } from "vitest";

const snapshotPath = "scripts/supabase-security-advisor-readback-20260923-2049.json";

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
    previousObservedFindingCount: number;
    findingCountDelta: number;
    findings: Array<{
      name: string;
      level: string;
      facing: string;
      count: number;
      remediation: string;
      classification: string;
      tablesWithAnonPrivileges: number;
      tablesWithAuthenticatedPrivileges: number;
      tablesWithServiceRolePrivileges: number;
    }>;
    newSincePreviousReadback: string[];
    launchRelevantTablesObserved: string[];
    advisorDisposition: string;
    remainingVerification: string;
  };
};

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as Snapshot;

describe("fresh Hosted security advisor read-back", () => {
  it("is evidence-only and records no Hosted mutation", () => {
    expect(snapshot.source.provider).toMatch(/^Supabase Security Advisor/);
    expect(snapshot.source.queryMode).toBe("READ_ONLY");
    expect(snapshot.source.hostedMutationPerformed).toBe(false);
  });

  it("records the observed advisor increase without converting it into an exposure claim", () => {
    expect(snapshot.securityRegression.previousObservedFindingCount).toBe(19);
    expect(snapshot.securityRegression.findingCount).toBe(21);
    expect(snapshot.securityRegression.findingCountDelta).toBe(2);
    expect(snapshot.securityRegression.status).toBe("NEEDS_REVIEW");
    expect(snapshot.securityRegression.advisorDisposition).toMatch(/does not by itself establish/i);
  });

  it("keeps the RLS-with-no-policy family classified from independent privilege read-back", () => {
    expect(snapshot.securityRegression.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "rls_enabled_no_policy",
          facing: "EXTERNAL",
          count: 21,
          classification: "REVIEWED_SERVICE_ROLE_ONLY",
          tablesWithAnonPrivileges: 0,
          tablesWithAuthenticatedPrivileges: 0,
          tablesWithServiceRolePrivileges: 21,
        }),
      ]),
    );
  });

  it("tracks the two newly observed service-role-only tables explicitly", () => {
    expect(snapshot.securityRegression.newSincePreviousReadback).toEqual([
      "rcv3_preview_email_notices",
      "rcv3_preview_email_worker_state",
    ]);
  });

  it("keeps launch-relevant recording, provider, AI credential, phone, email and order tables visible", () => {
    expect(snapshot.securityRegression.launchRelevantTablesObserved).toEqual(
      expect.arrayContaining([
        "communication_recording_policies",
        "rc_service_provider_offers",
        "rc_service_providers",
        "rcv3_customer_ai_credentials",
        "rcv3_customer_phone_accounts",
        "rcv3_customer_phone_calls",
        "rcv3_preview_email_notices",
        "rcv3_preview_email_worker_state",
        "rcv3_preview_orders",
      ]),
    );
  });

  it("remains fail-closed on deployment authorization and stores no secrets/customer identifiers", () => {
    expect(snapshot.securityRegression.remainingVerification).toMatch(/provenance\/authority is unresolved/i);
    expect(snapshot.securityRegression.remainingVerification).toMatch(/Do not treat an expected fail-closed linked dry-run as deployment authorization/i);

    const raw = fs.readFileSync(snapshotPath, "utf8");
    expect(raw).not.toMatch(/anon_key|service_role_key|jwt[_-]?secret|password|api[_-]?secret/i);
    expect(raw).not.toMatch(/"owner_id"\s*:|"customer_number"\s*:|"customer_sequence"\s*:/i);
  });
});
