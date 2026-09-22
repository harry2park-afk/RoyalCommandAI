import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  verifyCountryLegalCompliance: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/utils", () => ({ isSupabaseConfigured: mocks.isSupabaseConfigured }));
vi.mock("@/lib/compliance/countryComplianceStore", () => ({
  verifyCountryLegalCompliance: mocks.verifyCountryLegalCompliance,
}));

import { POST } from "./route";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.test",
  fullName: "Launch Owner",
  defaultLanguage: "en-AU",
  countryCode: "AU",
  mode: "supabase" as const,
};

function request(serviceKey: string) {
  return new Request("https://royalcommand.ai/api/rca/services", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ serviceKey, action: "agree_connect", agree: true }),
  });
}

function queryBuilder<T>(result: T) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function approvedCountryTerm() {
  return queryBuilder({
    data: {
      availability_status: "available",
      review_status: "approved",
      reviewed_by: "33333333-3333-4333-8333-333333333333",
      reviewed_at: "2026-09-22T07:51:00.000Z",
    },
    error: null,
  });
}

describe("RCA service launch fail-closed boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.verifyCountryLegalCompliance.mockResolvedValue({ verified: true, error: null });
  });

  it("does not create a selection or order when the global connection status is not available", async () => {
    const catalog = queryBuilder({
      data: {
        service_key: "operationally-blocked-service",
        default_included: false,
        active: true,
        customer_selectable: true,
        connection_scope: "rca_chat",
        connection_status: "review",
        pricing_type: "free",
        price_status: "fixed",
        price_minor: 0,
        currency: "AUD",
        terms_version: "2026-09",
        agreement_required: false,
      },
      error: null,
    });
    const countryTerms = approvedCountryTerm();
    const selections = { upsert: vi.fn() };
    const orders = { insert: vi.fn() };

    mocks.from.mockImplementation((table: string) => {
      if (table === "rc_service_catalog") return catalog;
      if (table === "rc_service_country_terms") return countryTerms;
      if (table === "rc_user_service_selections") return selections;
      if (table === "rc_service_connection_orders") return orders;
      throw new Error(`unexpected table ${table}`);
    });
    mocks.createClient.mockResolvedValue({ from: mocks.from });

    const response = await POST(request("operationally-blocked-service"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Service connection is not operationally ready",
      code: "SERVICE_CONNECTION_NOT_READY",
      serviceKey: "operationally-blocked-service",
    });
    expect(countryTerms.maybeSingle).not.toHaveBeenCalled();
    expect(mocks.verifyCountryLegalCompliance).not.toHaveBeenCalled();
    expect(selections.upsert).not.toHaveBeenCalled();
    expect(orders.insert).not.toHaveBeenCalled();
  });

  it("does not create a selection or order when the service has no available country term", async () => {
    const catalog = queryBuilder({
      data: {
        service_key: "country-blocked-service",
        default_included: false,
        active: true,
        customer_selectable: true,
        connection_scope: "rca_chat",
        connection_status: "available",
        pricing_type: "free",
        price_status: "fixed",
        price_minor: 0,
        currency: "AUD",
        terms_version: "2026-09",
        agreement_required: false,
      },
      error: null,
    });
    const countryTerms = queryBuilder({ data: null, error: null });
    const selections = { upsert: vi.fn() };
    const orders = { insert: vi.fn() };

    mocks.from.mockImplementation((table: string) => {
      if (table === "rc_service_catalog") return catalog;
      if (table === "rc_service_country_terms") return countryTerms;
      if (table === "rc_user_service_selections") return selections;
      if (table === "rc_service_connection_orders") return orders;
      throw new Error(`unexpected table ${table}`);
    });
    mocks.createClient.mockResolvedValue({ from: mocks.from });

    const response = await POST(request("country-blocked-service"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Service is not approved for connection in this country",
      code: "COUNTRY_SERVICE_NOT_READY",
      serviceKey: "country-blocked-service",
      countryCode: "AU",
    });
    expect(mocks.verifyCountryLegalCompliance).not.toHaveBeenCalled();
    expect(selections.upsert).not.toHaveBeenCalled();
    expect(orders.insert).not.toHaveBeenCalled();
  });

  it("does not create a selection or order when an available country term lacks reviewer-proven approval", async () => {
    const catalog = queryBuilder({
      data: {
        service_key: "unreviewed-country-service",
        default_included: false,
        active: true,
        customer_selectable: true,
        connection_scope: "rca_chat",
        connection_status: "available",
        pricing_type: "free",
        price_status: "fixed",
        price_minor: 0,
        currency: "AUD",
        terms_version: "2026-09",
        agreement_required: false,
      },
      error: null,
    });
    const countryTerms = queryBuilder({
      data: {
        availability_status: "available",
        review_status: "needs_review",
        reviewed_by: null,
        reviewed_at: null,
      },
      error: null,
    });
    const selections = { upsert: vi.fn() };
    const orders = { insert: vi.fn() };

    mocks.from.mockImplementation((table: string) => {
      if (table === "rc_service_catalog") return catalog;
      if (table === "rc_service_country_terms") return countryTerms;
      if (table === "rc_user_service_selections") return selections;
      if (table === "rc_service_connection_orders") return orders;
      throw new Error(`unexpected table ${table}`);
    });
    mocks.createClient.mockResolvedValue({ from: mocks.from });

    const response = await POST(request("unreviewed-country-service"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Service is not approved for connection in this country",
      code: "COUNTRY_SERVICE_NOT_READY",
      serviceKey: "unreviewed-country-service",
      countryCode: "AU",
    });
    expect(mocks.verifyCountryLegalCompliance).not.toHaveBeenCalled();
    expect(selections.upsert).not.toHaveBeenCalled();
    expect(orders.insert).not.toHaveBeenCalled();
  });

  it("does not create a selection or order without current reviewer-proven legal compliance evidence", async () => {
    const catalog = queryBuilder({
      data: {
        service_key: "legal-blocked-service",
        default_included: false,
        active: true,
        customer_selectable: true,
        connection_scope: "rca_chat",
        connection_status: "available",
        pricing_type: "free",
        price_status: "fixed",
        price_minor: 0,
        currency: "AUD",
        terms_version: "2026-09",
        agreement_required: false,
      },
      error: null,
    });
    const countryTerms = approvedCountryTerm();
    const selections = { upsert: vi.fn() };
    const orders = { insert: vi.fn() };
    mocks.verifyCountryLegalCompliance.mockResolvedValue({ verified: false, error: null });

    mocks.from.mockImplementation((table: string) => {
      if (table === "rc_service_catalog") return catalog;
      if (table === "rc_service_country_terms") return countryTerms;
      if (table === "rc_user_service_selections") return selections;
      if (table === "rc_service_connection_orders") return orders;
      throw new Error(`unexpected table ${table}`);
    });
    mocks.createClient.mockResolvedValue({ from: mocks.from });

    const response = await POST(request("legal-blocked-service"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Country legal compliance is not verified for service connection",
      code: "COUNTRY_COMPLIANCE_NOT_READY",
      serviceKey: "legal-blocked-service",
      countryCode: "AU",
    });
    expect(mocks.verifyCountryLegalCompliance).toHaveBeenCalledWith("AU");
    expect(selections.upsert).not.toHaveBeenCalled();
    expect(orders.insert).not.toHaveBeenCalled();
  });

  it("does not create a selection or order when fixed-price checkout is disconnected", async () => {
    const catalog = queryBuilder({
      data: {
        service_key: "paid-service",
        default_included: false,
        active: true,
        customer_selectable: true,
        connection_scope: "rca_chat",
        connection_status: "available",
        pricing_type: "monthly",
        price_status: "fixed",
        price_minor: 4900,
        currency: "AUD",
        terms_version: "2026-09",
        agreement_required: false,
      },
      error: null,
    });
    const countryTerms = approvedCountryTerm();
    const selections = { upsert: vi.fn() };
    const orders = { insert: vi.fn() };

    mocks.from.mockImplementation((table: string) => {
      if (table === "rc_service_catalog") return catalog;
      if (table === "rc_service_country_terms") return countryTerms;
      if (table === "rc_user_service_selections") return selections;
      if (table === "rc_service_connection_orders") return orders;
      throw new Error(`unexpected table ${table}`);
    });
    mocks.createClient.mockResolvedValue({ from: mocks.from });

    const response = await POST(request("paid-service"));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Checkout is not connected",
      code: "CHECKOUT_NOT_READY",
      serviceKey: "paid-service",
      paymentRequired: true,
      checkoutConfigured: false,
    });
    expect(mocks.verifyCountryLegalCompliance).toHaveBeenCalledWith("AU");
    expect(selections.upsert).not.toHaveBeenCalled();
    expect(orders.insert).not.toHaveBeenCalled();
  });

  it("does not create a selection or order when pricing is quote/TBD", async () => {
    const catalog = queryBuilder({
      data: {
        service_key: "quote-service",
        default_included: false,
        active: true,
        customer_selectable: true,
        connection_scope: "rca_chat",
        connection_status: "available",
        pricing_type: "custom",
        price_status: "quote",
        price_minor: null,
        currency: "AUD",
        terms_version: "2026-09",
        agreement_required: false,
      },
      error: null,
    });
    const countryTerms = approvedCountryTerm();
    const selections = { upsert: vi.fn() };
    const orders = { insert: vi.fn() };

    mocks.from.mockImplementation((table: string) => {
      if (table === "rc_service_catalog") return catalog;
      if (table === "rc_service_country_terms") return countryTerms;
      if (table === "rc_user_service_selections") return selections;
      if (table === "rc_service_connection_orders") return orders;
      throw new Error(`unexpected table ${table}`);
    });
    mocks.createClient.mockResolvedValue({ from: mocks.from });

    const response = await POST(request("quote-service"));

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("PRICE_NOT_FIXED");
    expect(mocks.verifyCountryLegalCompliance).toHaveBeenCalledWith("AU");
    expect(selections.upsert).not.toHaveBeenCalled();
    expect(orders.insert).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers before touching Supabase", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(request("paid-service"));

    expect(response.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.verifyCountryLegalCompliance).not.toHaveBeenCalled();
  });
});
