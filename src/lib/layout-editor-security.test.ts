import { describe, expect, it } from "vitest";
import { safeDeviceName, sha256Hex } from "./layout-editor-security";

describe("layout editor security primitives", () => {
  it("hashes opaque device tokens deterministically", () => {
    expect(sha256Hex("trusted-device-token")).toBe(sha256Hex("trusted-device-token"));
    expect(sha256Hex("trusted-device-token")).not.toBe(sha256Hex("other-token"));
  });

  it("sanitises trusted device labels", () => {
    expect(safeDeviceName("  Harry   Tablet  ")).toBe("Harry Tablet");
    expect(safeDeviceName(123)).toBe("Trusted device");
  });
});
