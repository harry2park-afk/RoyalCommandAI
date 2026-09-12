import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/utils", () => ({ isSupabaseConfigured: mocks.isSupabaseConfigured }));

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

describe("RCA service payment fail-closed boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.isSupabaseConfigured.mockReturnValue(true);
  });

  it("does not create a selection or order when fixed-price checkout is disconnected", async () => {
    const catalog = queryBuilder({
      data: {
        service_key: "paid-service",
        default_included: false,
        active: true,
        customer_selectable: true,
        connection_scope: "rca_chat",
        pricing_type: "monthly",
        price_status: "fixed",
        price_minor: 4900,
        currency: "AUD",
        terms_version: "2026-09",
        agreement_required: false,
      },
      error: null,
    });
    const selections = { upsert: vi.fn() };
    const orders = { insert: vi.fn() };

    mocks.from.mockImplementation((table: string) => {
      if (table === "rc_service_catalog") return catalog;
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
        pricing_type: "custom",
        price_status: "quote",
        price_minor: null,
        currency: "AUD",
        terms_version: "2026-09",
        agreement_required: false,
      },
      error: null,
    });
    const selections = { upsert: vi.fn() };
    const orders = { insert: vi.fn() };

    mocks.from.mockImplementation((table: string) => {
      if (table === "rc_service_catalog") return catalog;
      if (table === "rc_user_service_selections") return selections;
      if (table === "rc_service_connection_orders") return orders;
      throw new Error(`unexpected table ${table}`);
    });
    mocks.createClient.mockResolvedValue({ from: mocks.from });

    const response = await POST(request("quote-service"));

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("PRICING_NOT_READY");
    expect(selections.upsert).not.toHaveBeenCalled();
    expect(orders.insert).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers before touching Supabase", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(request("paid-service"));

    expect(response.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
