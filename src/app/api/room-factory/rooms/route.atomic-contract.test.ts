import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Room Factory create runtime contract", () => {
  it("routes all POST creation through the atomic authenticated RPC", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/app/api/room-factory/rooms/route.ts"),
      "utf8",
    );

    expect(source).toContain('.rpc("create_room_factory_room_atomic"');
    expect(source).toContain("p_encounter_session_id: rawInput.encounterSessionId ?? null");
    expect(source).toContain("p_household_id: rawInput.householdId ?? null");
    expect(source).toContain("p_manifest: storedManifest");

    expect(source).not.toMatch(/\.from\("room_factory_manifests"\)\s*\.insert\(/);
    expect(source).not.toMatch(/\.from\("rooms"\)\s*\.insert\(/);
    expect(source).not.toMatch(/\.from\("households"\)\s*\.insert\(/);
    expect(source).not.toMatch(/\.from\("room_members"\)\s*\.insert\(/);
    expect(source).not.toContain('.contains("manifest", { encounterSessionId:');
  });

  it("fails closed with a stable 503 contract when Hosted still rejects null encounters", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/app/api/room-factory/rooms/route.ts"),
      "utf8",
    );

    expect(source).toContain("encounterSessionId is required for atomic Room creation.");
    expect(source).toContain("isNonEncounterSchemaNotReady(rawInput.encounterSessionId, createError.message)");
    expect(source).toContain('code: "ROOM_FACTORY_SCHEMA_NOT_READY"');
    expect(source).toContain("{ status: 503 }");
  });
});
