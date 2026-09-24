import fs from "node:fs";
import { describe, expect, it } from "vitest";

const reconstructionPath =
  "scripts/supabase-customer-number-schema-reconstruction-20260921.sql";

function executableSql(source: string): string {
  return source
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

describe("customer-number schema-only reconstruction evidence", () => {
  const source = fs.readFileSync(reconstructionPath, "utf8");
  const sql = executableSql(source);

  it("stays outside the deployable migration tree and contains no row DML statements or UUID values", () => {
    expect(reconstructionPath.startsWith("supabase/migrations/")).toBe(false);
    expect(sql).not.toMatch(/(?:^|;\s*)\s*(?:insert\s+into|update\s+|delete\s+from|copy\s+)/im);
    expect(sql).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
  });

  it("captures the observed non-PII sequence, table, constraints, RLS and read policy shape", () => {
    expect(sql).toMatch(/create\s+sequence\s+public\.rc_customer_number_seq/i);
    expect(sql).toMatch(/start\s+with\s+357071/i);
    expect(sql).toMatch(/create\s+table\s+public\.rc_customer_accounts/i);
    expect(sql).toMatch(/owner_id\s+uuid\s+primary\s+key\s+references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/i);
    expect(sql).toContain("customer_number ~ '^RC [0-9]{7}$'::text");
    expect(sql).toMatch(/customer_sequence\s*>=\s*357060/i);
    expect(sql).toMatch(/enable\s+row\s+level\s+security/i);
    expect(sql).toMatch(/create\s+policy\s+rc_customer_accounts_read_own/i);
    expect(sql).toMatch(/using\s*\(owner_id\s*=\s*auth\.uid\(\)\)/i);
  });

  it("does not invent an allocator or claim broader deployment authority", () => {
    expect(sql).not.toMatch(/create\s+(?:or\s+replace\s+)?function/i);
    expect(sql).not.toMatch(/create\s+trigger/i);
    expect(sql).not.toMatch(/default\s+nextval/i);
    expect(source).toContain("does NOT close deployment provenance by itself");
    expect(source).toContain("does NOT authorize");
  });
});
