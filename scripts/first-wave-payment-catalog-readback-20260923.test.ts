import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const snapshot = JSON.parse(
  readFileSync(
    new URL("./first-wave-payment-catalog-readback-20260923-1452.json", import.meta.url),
    "utf8",
  ),
) as {
  hosted_mutation_performed_by_this_capture: boolean;
  production_master_mutated_by_this_capture: boolean;
  service_catalog: {
    selectable_active_services: number;
    selectable_positive_price_services: number;
    first_wave_country_term_rows: number;
    breakdown: Array<{
      pricing_type: string;
      currency: string;
      price_status: string;
      connection_status: string;
      rows: number;
    }>;
  };
  payment_runtime: {
    rca_services_route_checkout_configured_literal_false: boolean;
    room_services_route_checkout_configured_literal_false: boolean;
    payment_provider_registry_present: boolean;
    payment_provider_events_present: boolean;
    service_connection_orders_present: boolean;
  };
  first_wave: {
    countries: string[];
    country_commercial_catalog_verified: boolean;
    payment_operations_verified: boolean;
    payment_provider_sandbox_verified: boolean;
    disposition: string;
  };
  interpretation: {
    checkout_activation_authorized: boolean;
    positive_pricing_authorized: boolean;
    country_terms_authorized: boolean;
    country_ready_claimed: boolean;
  };
};

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

describe("first-wave payment/catalog Hosted readback", () => {
  it("records a read-only evidence capture and keeps all six launch countries fail-closed", () => {
    expect(snapshot.hosted_mutation_performed_by_this_capture).toBe(false);
    expect(snapshot.production_master_mutated_by_this_capture).toBe(false);
    expect(snapshot.first_wave.countries).toEqual(["AU", "US", "CA", "KR", "JP", "GB"]);
    expect(snapshot.first_wave.disposition).toBe("HOLD");
    expect(snapshot.first_wave.country_commercial_catalog_verified).toBe(false);
    expect(snapshot.first_wave.payment_operations_verified).toBe(false);
    expect(snapshot.first_wave.payment_provider_sandbox_verified).toBe(false);
    expect(snapshot.interpretation.country_ready_claimed).toBe(false);
  });

  it("does not treat the current selectable catalog as commercially launch-ready", () => {
    expect(snapshot.service_catalog.selectable_active_services).toBe(40);
    expect(snapshot.service_catalog.selectable_positive_price_services).toBe(0);
    expect(snapshot.service_catalog.first_wave_country_term_rows).toBe(0);
    expect(
      snapshot.service_catalog.breakdown.reduce((sum, group) => sum + group.rows, 0),
    ).toBe(snapshot.service_catalog.selectable_active_services);
    expect(snapshot.service_catalog.breakdown.every((group) => group.connection_status === "planned")).toBe(true);
    expect(snapshot.interpretation.positive_pricing_authorized).toBe(false);
    expect(snapshot.interpretation.country_terms_authorized).toBe(false);
  });

  it("keeps paid checkout fail-closed in both service connection routes", () => {
    const rcaRoute = source("src/app/api/rca/services/route.ts");
    const roomRoute = source("src/app/api/rooms/[id]/services/route.ts");

    expect(snapshot.payment_runtime.rca_services_route_checkout_configured_literal_false).toBe(true);
    expect(snapshot.payment_runtime.room_services_route_checkout_configured_literal_false).toBe(true);
    expect(rcaRoute).toContain("const CHECKOUT_CONFIGURED = false;");
    expect(roomRoute).toContain("const CHECKOUT_CONFIGURED = false;");
    expect(snapshot.interpretation.checkout_activation_authorized).toBe(false);
  });

  it("requires real provider evidence instead of inferring readiness from the order table", () => {
    expect(snapshot.payment_runtime.service_connection_orders_present).toBe(true);
    expect(snapshot.payment_runtime.payment_provider_registry_present).toBe(false);
    expect(snapshot.payment_runtime.payment_provider_events_present).toBe(false);
    expect(snapshot.first_wave.payment_provider_sandbox_verified).toBe(false);
  });
});
