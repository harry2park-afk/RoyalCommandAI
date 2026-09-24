import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const snapshot = JSON.parse(
  readFileSync(
    new URL("./first-wave-payment-idempotency-readback-20260923-1950.json", import.meta.url),
    "utf8",
  ),
) as {
  hosted_mutation_performed_by_this_capture: boolean;
  production_master_mutated_by_this_capture: boolean;
  service_connection_orders: {
    table: string;
    rls_enabled: boolean;
    force_rls_enabled: boolean;
    authenticated_privileges: string[];
    authenticated_update_privilege: boolean;
    authenticated_delete_privilege: boolean;
    owner_insert_pending_policy_present: boolean;
    owner_select_policy_present: boolean;
    owner_insert_policy_requires_pending: boolean;
    owner_insert_policy_requires_payment_provider_null: boolean;
    owner_insert_policy_requires_external_checkout_id_null: boolean;
    owner_insert_policy_requires_external_payment_id_null: boolean;
    owner_insert_policy_requires_paid_at_null: boolean;
    external_checkout_id_column_present: boolean;
    external_payment_id_column_present: boolean;
    external_checkout_id_unique_constraint_or_index_present: boolean;
    external_payment_id_unique_constraint_or_index_present: boolean;
    idempotency_key_column_present: boolean;
    idempotency_key_unique_index_present: boolean;
    payment_or_checkout_named_function_count: number;
    payment_order_trigger_count: number;
  };
  hosted_payment_safeguards: {
    source_candidate_migration: string;
    source_candidate_version: string;
    hosted_migration_rows: number;
    payment_provider_registry_present: boolean;
    payment_provider_events_present: boolean;
    provider_event_uniqueness_hosted_verified: boolean;
    signed_webhook_event_chronology_hosted_verified: boolean;
    order_idempotency_hosted_verified: boolean;
    real_provider_sandbox_verified: boolean;
  };
  source_candidate_safeguards: {
    adds_nullable_idempotency_key: boolean;
    adds_owner_scoped_unique_idempotency_index: boolean;
    adds_provider_event_ledger: boolean;
    adds_provider_environment_external_event_unique_constraint: boolean;
    requires_signed_webhook_capability_for_ready_provider: boolean;
    stores_payload_digest_not_raw_payload: boolean;
    source_only_until_separately_approved: boolean;
  };
  interpretation: {
    least_privilege_insert_surface_observed: boolean;
    schema_presence_alone_proves_payment_readiness: boolean;
    absence_of_db_idempotency_proves_duplicate_charge_vulnerability: boolean;
    checkout_activation_authorized: boolean;
    country_ready_claimed: boolean;
    disposition: string;
    reason: string;
  };
  first_wave_countries: string[];
};

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

describe("first-wave Hosted payment idempotency readback", () => {
  it("records a read-only capture and preserves the stable production boundary", () => {
    expect(snapshot.hosted_mutation_performed_by_this_capture).toBe(false);
    expect(snapshot.production_master_mutated_by_this_capture).toBe(false);
    expect(snapshot.first_wave_countries).toEqual(["AU", "US", "CA", "KR", "JP", "GB"]);
    expect(snapshot.interpretation.disposition).toBe("HOLD");
    expect(snapshot.interpretation.checkout_activation_authorized).toBe(false);
    expect(snapshot.interpretation.country_ready_claimed).toBe(false);
  });

  it("records the current owner-only pending insert surface without overstating payment readiness", () => {
    const orders = snapshot.service_connection_orders;

    expect(orders.table).toBe("rc_service_connection_orders");
    expect(orders.rls_enabled).toBe(true);
    expect(orders.authenticated_privileges).toEqual(["INSERT", "SELECT"]);
    expect(orders.authenticated_update_privilege).toBe(false);
    expect(orders.authenticated_delete_privilege).toBe(false);
    expect(orders.owner_insert_pending_policy_present).toBe(true);
    expect(orders.owner_select_policy_present).toBe(true);
    expect(orders.owner_insert_policy_requires_pending).toBe(true);
    expect(orders.owner_insert_policy_requires_payment_provider_null).toBe(true);
    expect(orders.owner_insert_policy_requires_external_checkout_id_null).toBe(true);
    expect(orders.owner_insert_policy_requires_external_payment_id_null).toBe(true);
    expect(orders.owner_insert_policy_requires_paid_at_null).toBe(true);
    expect(snapshot.interpretation.least_privilege_insert_surface_observed).toBe(true);
    expect(snapshot.interpretation.schema_presence_alone_proves_payment_readiness).toBe(false);
  });

  it("fails closed while Hosted order idempotency and external provider identifiers lack DB uniqueness evidence", () => {
    const orders = snapshot.service_connection_orders;

    expect(orders.external_checkout_id_column_present).toBe(true);
    expect(orders.external_payment_id_column_present).toBe(true);
    expect(orders.external_checkout_id_unique_constraint_or_index_present).toBe(false);
    expect(orders.external_payment_id_unique_constraint_or_index_present).toBe(false);
    expect(orders.idempotency_key_column_present).toBe(false);
    expect(orders.idempotency_key_unique_index_present).toBe(false);
    expect(orders.payment_or_checkout_named_function_count).toBe(0);
    expect(orders.payment_order_trigger_count).toBe(0);
    expect(snapshot.hosted_payment_safeguards.order_idempotency_hosted_verified).toBe(false);

    // Missing DB-enforced evidence is a launch blocker, not proof that a duplicate-charge exploit exists.
    expect(snapshot.interpretation.absence_of_db_idempotency_proves_duplicate_charge_vulnerability).toBe(false);
  });

  it("keeps the stronger payment safeguard migration source-only until controlled approval and staging", () => {
    const migration = source(snapshot.hosted_payment_safeguards.source_candidate_migration);

    expect(snapshot.hosted_payment_safeguards.source_candidate_version).toBe("20260903205500");
    expect(snapshot.hosted_payment_safeguards.hosted_migration_rows).toBe(0);
    expect(snapshot.hosted_payment_safeguards.payment_provider_registry_present).toBe(false);
    expect(snapshot.hosted_payment_safeguards.payment_provider_events_present).toBe(false);
    expect(snapshot.hosted_payment_safeguards.provider_event_uniqueness_hosted_verified).toBe(false);
    expect(snapshot.hosted_payment_safeguards.signed_webhook_event_chronology_hosted_verified).toBe(false);
    expect(snapshot.hosted_payment_safeguards.real_provider_sandbox_verified).toBe(false);

    expect(snapshot.source_candidate_safeguards.adds_nullable_idempotency_key).toBe(true);
    expect(snapshot.source_candidate_safeguards.adds_owner_scoped_unique_idempotency_index).toBe(true);
    expect(snapshot.source_candidate_safeguards.adds_provider_event_ledger).toBe(true);
    expect(snapshot.source_candidate_safeguards.adds_provider_environment_external_event_unique_constraint).toBe(true);
    expect(snapshot.source_candidate_safeguards.requires_signed_webhook_capability_for_ready_provider).toBe(true);
    expect(snapshot.source_candidate_safeguards.stores_payload_digest_not_raw_payload).toBe(true);
    expect(snapshot.source_candidate_safeguards.source_only_until_separately_approved).toBe(true);

    expect(migration).toContain("This migration is source-only until separately approved for a controlled Hosted cutover.");
    expect(migration).toContain("add column if not exists idempotency_key text");
    expect(migration).toContain("rc_service_connection_orders_owner_idempotency_uidx");
    expect(migration).toContain("unique (provider_key, environment, external_event_id)");
    expect(migration).toContain("supports_signed_webhooks boolean not null default false");
    expect(migration).toContain("payload_sha256 text not null");
  });
});
