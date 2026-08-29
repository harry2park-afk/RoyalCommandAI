import { describe, expect, it } from "vitest";
import { getSupabaseAdminConfig } from "./admin";

describe("Supabase server admin configuration", () => {
  it("returns trimmed server configuration when both required values exist", () => {
    expect(
      getSupabaseAdminConfig({
        NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
        SUPABASE_SERVICE_ROLE_KEY: " service-role-key ",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      serviceRoleKey: "service-role-key",
    });
  });

  it("fails closed when the service-role key is missing even if an anon key exists", () => {
    expect(() =>
      getSupabaseAdminConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toThrow(/server admin client is not configured/i);
  });

  it("fails closed when the Supabase URL is missing", () => {
    expect(() =>
      getSupabaseAdminConfig({
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toThrow(/server admin client is not configured/i);
  });
});
