import { describe, expect, it } from "vitest";
import {
  ROOM_HEADER_LAYOUT_CONFIG_VERSION,
  sanitiseRoomHeaderLayoutConfig,
} from "./layout-editor";

describe("room header layout config", () => {
  it("accepts known elements and clamps numeric values", () => {
    const result = sanitiseRoomHeaderLayoutConfig({
      screenId: "ROOM_HEADER",
      layoutVersion: 3,
      updatedAt: "2026-09-04T00:00:00Z",
      elements: {
        "build-your-room": {
          offsetX: 5000,
          offsetY: -500,
          width: 1000,
          height: 2,
          fontSize: 99,
          label: "  Build   Your   Room  ",
        },
      },
    });

    expect(result?.schemaVersion).toBe(ROOM_HEADER_LAYOUT_CONFIG_VERSION);
    expect(result?.elements["build-your-room"]).toEqual({
      offsetX: 1200,
      offsetY: -92,
      width: 520,
      height: 20,
      fontSize: 32,
      label: "Build Your Room",
    });
  });

  it("drops unknown element ids instead of allowing arbitrary DOM control", () => {
    const result = sanitiseRoomHeaderLayoutConfig({
      screenId: "ROOM_HEADER",
      layoutVersion: 1,
      elements: {
        "customer-secret-field": { offsetX: 20, label: "unsafe" },
        "ai-codex": { offsetX: 4 },
      },
    });

    expect(result?.elements).toEqual({ "ai-codex": { offsetX: 4 } });
  });

  it("rejects configs for another screen", () => {
    expect(sanitiseRoomHeaderLayoutConfig({ screenId: "DASHBOARD_MAIN", elements: {} })).toBeUndefined();
  });
});
