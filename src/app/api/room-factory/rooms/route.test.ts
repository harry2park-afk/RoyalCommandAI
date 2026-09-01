import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  compileRoomFactoryV2Blueprint: vi.fn(),
  resolveDomainProfile: vi.fn(),
  defaultRoomName: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/utils", () => ({ isSupabaseConfigured: mocks.isSupabaseConfigured }));
vi.mock("@/lib/rooms/factory", () => ({
  compileRoomFactoryV2Blueprint: mocks.compileRoomFactoryV2Blueprint,
}));
vi.mock("@/lib/rooms/factory-v2", () => ({
  resolveDomainProfile: mocks.resolveDomainProfile,
  defaultRoomName: mocks.defaultRoomName,
}));
vi.mock("@/lib/rooms/global", () => ({
  DEFAULT_GLOBAL_ROOM_SETTINGS: {
    countryCode: "GLOBAL",
    languageTag: "en",
    timeZone: "UTC",
    currencyCode: "AUD",
  },
  GLOBAL_ROOM_PRESETS: [
    {
      id: "AU",
      countryCode: "AU",
      languageTag: "en-AU",
      timeZone: "Australia/Sydney",
      currencyCode: "AUD",
    },
  ],
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

const blueprint = {
  version: "2.0",
  readiness: { readyForSafeBuild: true },
  room: {
    name: "Launch Owner's First Meeting",
    templateName: "First Meeting",
    purpose: "Safe launch intake",
    templateId: "custom",
  },
  locale: {
    languageTag: "en-AU",
    countryCode: "AU",
    countryProfileStatus: "CONFIGURED",
  },
};

const encounterSessionId = "22222222-2222-4222-8222-222222222222";
const householdId = "33333333-3333-4333-8333-333333333333";
const roomId = "44444444-4444-4444-8444-444444444444";
const manifestId = "55555555-5555-4555-8555-555555555555";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/room-factory/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(extra: Record<string, unknown> = {}) {
  return {
    templateId: "custom",
    countryCode: "AU",
    encounterSessionId,
    ...extra,
  };
}

function makeNonEncounterClient() {
  const room = { id: roomId, name: blueprint.room.name, status: "active" };
  const manifest = {
    id: manifestId,
    room_id: roomId,
    factory_version: blueprint.version,
    template_id: blueprint.room.templateId,
    country_code: blueprint.locale.countryCode,
    language_tag: blueprint.locale.languageTag,
    country_profile_status: blueprint.locale.countryProfileStatus,
    created_at: "2026-09-01T00:00:00.000Z",
  };

  const from = vi.fn((table: string) => {
    if (table === "household_members") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { household_id: householdId }, error: null }),
            })),
          })),
        })),
      };
    }

    if (table === "rooms") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: room, error: null }) })),
        })),
      };
    }

    if (table === "room_members") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }

    if (table === "room_factory_manifests") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: manifest, error: null }) })),
        })),
      };
    }

    throw new Error(`Unexpected table in test: ${table}`);
  });

  return { from, rpc: vi.fn() };
}

describe("Room Factory POST route cutover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.resolveDomainProfile.mockReturnValue({
      template: { id: "custom" },
      profile: { templateId: "custom" },
    });
    mocks.defaultRoomName.mockReturnValue(blueprint.room.name);
    mocks.compileRoomFactoryV2Blueprint.mockReturnValue(blueprint);
  });

  it("fails closed for an unauthenticated caller before touching persistence", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(request(validBody()));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid encounter identifier before touching persistence", async () => {
    const response = await POST(request(validBody({ encounterSessionId: "not-a-uuid" })));

    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("uses the atomic RPC for encounter creation and returns 201 for the creator", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          room_data: { id: roomId, name: blueprint.room.name },
          manifest_data: { id: manifestId, room_id: roomId },
          reused: false,
        },
      ],
      error: null,
    });
    mocks.createClient.mockResolvedValue({ rpc });

    const response = await POST(request(validBody()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.reused).toBe(false);
    expect(body.room.id).toBe(roomId);
    expect(body.manifest.id).toBe(manifestId);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "create_room_factory_room_atomic",
      expect.objectContaining({
        p_encounter_session_id: encounterSessionId,
        p_household_id: null,
        p_country_code: "AU",
        p_language_tag: "en-AU",
        p_manifest: expect.objectContaining({ encounterSessionId }),
      }),
    );
  });

  it("returns the authoritative reused Room with 200 on an idempotent encounter replay", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          room_data: { id: roomId, name: blueprint.room.name },
          manifest_data: { id: manifestId, room_id: roomId },
          reused: true,
        },
      ],
      error: null,
    });
    mocks.createClient.mockResolvedValue({ rpc });

    const response = await POST(request(validBody()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reused).toBe(true);
    expect(body.room.id).toBe(roomId);
    expect(body.manifest.id).toBe(manifestId);
  });

  it("fails closed when the atomic RPC errors or returns no persisted Room", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "atomic failure" } })
      .mockResolvedValueOnce({ data: [], error: null });
    mocks.createClient.mockResolvedValue({ rpc });

    const failed = await POST(request(validBody()));
    expect(failed.status).toBe(500);
    expect(await failed.json()).toEqual({ error: "atomic failure" });

    const missing = await POST(request(validBody()));
    expect(missing.status).toBe(500);
    expect(await missing.json()).toEqual({ error: "Atomic Room Factory creation returned no persisted Room." });
  });

  it("keeps the existing non-encounter creation path off the atomic RPC", async () => {
    const client = makeNonEncounterClient();
    mocks.createClient.mockResolvedValue(client);

    const response = await POST(request({ templateId: "custom", countryCode: "AU" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.reused).toBe(false);
    expect(body.room.id).toBe(roomId);
    expect(body.manifest.id).toBe(manifestId);
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
