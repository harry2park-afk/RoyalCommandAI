import { describe, expect, it } from "vitest";
import { sanitiseRoomHeaderStyleConfig } from "./layout-editor-style";

describe("room header style config", () => {
  it("accepts safe style values and clamps strength/border width", () => {
    const result = sanitiseRoomHeaderStyleConfig({
      screenId: "ROOM_HEADER_STYLE",
      updatedAt: "2026-09-05T00:00:00Z",
      elements: {
        "build-your-room": {
          borderColor: "#12abEF",
          backgroundColor: "#102030",
          textColor: "#fFaa00",
          colourStrength: 99,
          borderWidth: 9,
        },
      },
    });

    expect(result?.elements["build-your-room"]).toEqual({
      borderColor: "#12ABEF",
      backgroundColor: "#102030",
      textColor: "#FFAA00",
      colourStrength: 10,
      borderWidth: 5,
    });
  });

  it("rejects unsafe colours and unknown element ids", () => {
    const result = sanitiseRoomHeaderStyleConfig({
      screenId: "ROOM_HEADER_STYLE",
      elements: {
        "customer-secret-field": { borderColor: "#FFFFFF" },
        "ai-warehouse": {
          borderColor: "url(javascript:alert(1))",
          backgroundColor: "red",
          textColor: "expression(alert(1))",
        },
      },
    });

    expect(result?.elements).toEqual({ "ai-warehouse": {} });
  });

  it("rejects another screen", () => {
    expect(sanitiseRoomHeaderStyleConfig({ screenId: "OTHER", elements: {} })).toBeUndefined();
  });
});
