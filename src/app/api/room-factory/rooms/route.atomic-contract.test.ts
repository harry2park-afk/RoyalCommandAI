import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Room Factory create runtime contract", () => {
  it("routes all POST creation through the atomic authenticated RPC", async () => {
    const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");

    expect(source).toContain('.rpc("create_room_factory_room_atomic"');
    expect(source).toContain("p_encounter_session_id: rawInput.encounterSessionId ?? null");
    expect(source).toContain("p_household_id: rawInput.householdId ?? null");
    expect(source).toContain("p_manifest: storedManifest");

    expect(source).not.toMatch(/\.from\("room_factory_manifests"\)\s*\.insert\(/s);
    expect(source).not.toMatch(/\.from\("rooms"\)\s*\.insert\(/s);
    expect(source).not.toMatch(/\.from\("households"\)\s*\.insert\(/s);
    expect(source).not.toMatch(/\.from\("room_members"\)\s*\.insert\(/s);
    expect(source).not.toContain('.contains("manifest", { encounterSessionId:');
  });
});
