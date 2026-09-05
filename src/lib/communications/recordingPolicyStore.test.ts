import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import { loadRecordingPolicyRows } from "./recordingPolicyStore";

describe("recording policy server store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test-key");

    mocks.createClient.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockResolvedValue({ data: [], error: null });
  });

  it("fails closed when the server-only service role key is unavailable", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    await expect(loadRecordingPolicyRows("AU")).resolves.toEqual({
      rows: [],
      error: "recording_policy_store_unavailable",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("uses the service-role client and requests only minimum policy fields for one country", async () => {
    mocks.eq.mockResolvedValue({
      data: [
        {
          country_code: "au",
          region_code: null,
          review_status: "approved",
          recording_policy: "consent_required",
        },
      ],
      error: null,
    });

    await expect(loadRecordingPolicyRows(" au ")).resolves.toEqual({
      rows: [
        {
          country_code: "AU",
          region_code: null,
          review_status: "approved",
          recording_policy: "consent_required",
        },
      ],
      error: null,
    });

    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-test-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    expect(mocks.from).toHaveBeenCalledWith("communication_recording_policies");
    expect(mocks.select).toHaveBeenCalledWith(
      "country_code, region_code, review_status, recording_policy",
    );
    expect(mocks.eq).toHaveBeenCalledWith("country_code", "AU");
  });

  it("returns no policy rows when the trusted database read fails", async () => {
    mocks.eq.mockResolvedValue({ data: null, error: { message: "permission denied" } });

    await expect(loadRecordingPolicyRows("US")).resolves.toEqual({
      rows: [],
      error: "permission denied",
    });
  });
});
