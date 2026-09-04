import { describe, expect, it } from "vitest";
import { base64url, fromBase64url, safeDeviceName } from "./layout-editor-security";

describe("layout editor security primitives", () => {
  it("round-trips base64url without padding", () => {
    const raw = Buffer.from("royal-command-layout-editor");
    expect(fromBase64url(base64url(raw))).toEqual(raw);
  });

  it("sanitises trusted device labels", () => {
    expect(safeDeviceName("  Harry   Tablet  ")).toBe("Harry Tablet");
    expect(safeDeviceName(123)).toBe("Trusted device");
  });
});
