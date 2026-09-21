import fs from "node:fs";
import { describe, expect, it } from "vitest";

const snapshotPath = "scripts/first-wave-launch-readiness-readback-20260922.json";

type Snapshot = {
  source: {
    query_mode: string;
    hosted_mutation_performed: boolean;
  };
  customer_account_authority: {
    authenticated_insert: boolean;
    authenticated_update: boolean;
    authenticated_delete: boolean;
    authenticated_truncate: boolean;
    allocator_noninternal_triggers: number;
    allocator_functions: number;
    trusted_allocator_verified: boolean;
    verified: boolean;
  };
};

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as Snapshot;

describe("Hosted customer-account authority read-back", () => {
  it("is evidence-only and records no Hosted mutation", () => {
    expect(snapshot.source.query_mode).toBe("READ_ONLY");
    expect(snapshot.source.hosted_mutation_performed).toBe(false);
  });

  it("fails closed while authenticated still has direct destructive/control-plane writes", () => {
    const authority = snapshot.customer_account_authority;
    const unsafeDirectWrite =
      authority.authenticated_insert ||
      authority.authenticated_update ||
      authority.authenticated_delete ||
      authority.authenticated_truncate;

    expect(unsafeDirectWrite).toBe(true);
    expect(authority.verified).toBe(false);
  });

  it("fails closed until a trusted allocator is independently evidenced", () => {
    const authority = snapshot.customer_account_authority;
    const allocatorEvidencePresent =
      authority.allocator_noninternal_triggers > 0 || authority.allocator_functions > 0;

    expect(allocatorEvidencePresent).toBe(false);
    expect(authority.trusted_allocator_verified).toBe(false);
    expect(authority.verified).toBe(false);
  });

  it("does not persist customer row identifiers or assigned customer numbers in the evidence snapshot", () => {
    const raw = fs.readFileSync(snapshotPath, "utf8");

    expect(raw).not.toMatch(/"owner_id"\s*:/i);
    expect(raw).not.toMatch(/"customer_number"\s*:/i);
    expect(raw).not.toMatch(/"customer_sequence"\s*:/i);
    expect(raw).not.toMatch(/\bRC\s+\d{7}\b/);
  });
});
