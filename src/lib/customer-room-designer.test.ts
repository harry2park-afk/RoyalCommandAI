import { describe, expect, it } from "vitest";
import { sanitiseCustomerRoomDesignConfig } from "./customer-room-designer";

describe("customer room designer config", () => {
  it("accepts known controls and clamps safe style/layout values", () => {
    const result = sanitiseCustomerRoomDesignConfig({
      screenId: "ROOM_HEADER",
      updatedAt: "2026-09-05T00:00:00Z",
      elements: {
        "build-your-room": {
          offsetX: 9999,
          offsetY: -999,
          width: 999,
          height: 1,
          fontSize: 99,
          label: "  My   Room  ",
          borderColor: "#12abEF",
          backgroundColor: "#102030",
          colourStrength: 99,
          textColor: "#fFaa00",
          borderWidth: 99,
        },
      },
    });

    expect(result?.elements["build-your-room"]).toEqual({
      offsetX: 1200,
      offsetY: -92,
      width: 520,
      height: 20,
      fontSize: 32,
      label: "My Room",
      borderColor: "#12ABEF",
      backgroundColor: "#102030",
      colourStrength: 10,
      textColor: "#FFAA00",
      borderWidth: 5,
    });
  });

  it("drops unknown controls and unsafe colour values", () => {
    const result = sanitiseCustomerRoomDesignConfig({
      screenId: "ROOM_HEADER",
      elements: {
        "customer-secret": { offsetX: 5 },
        "ai-warehouse": {
          borderColor: "red",
          backgroundColor: "url(javascript:alert(1))",
          textColor: "expression(alert(1))",
        },
      },
    });

    expect(result?.elements).toEqual({ "ai-warehouse": {} });
  });

  it("rejects configs for another surface", () => {
    expect(sanitiseCustomerRoomDesignConfig({ screenId: "DASHBOARD", elements: {} })).toBeUndefined();
  });
});
