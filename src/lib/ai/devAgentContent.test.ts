import { describe, expect, it } from "vitest";
import { decodeDeveloperFilePayload } from "./devAgentContent";

describe("decodeDeveloperFilePayload", () => {
  it("decodes valid Base64 source", () => {
    const source = "export const ok = true;\n";
    expect(decodeDeveloperFilePayload({ contentBase64: Buffer.from(source).toString("base64") }, "src/test.ts")).toEqual({
      content: source,
      source: "contentBase64",
    });
  });

  it("falls back to plain content when Base64 is malformed", () => {
    const source = "export const fallback = true;\n";
    expect(decodeDeveloperFilePayload({ contentBase64: "%%%not-base64%%%", content: source }, "src/test.ts")).toEqual({
      content: source,
      source: "content",
    });
  });

  it("accepts source as a secondary plain-text field", () => {
    const source = "export const secondary = true;\n";
    expect(decodeDeveloperFilePayload({ source }, "src/test.ts")).toEqual({ content: source, source: "source" });
  });

  it("rejects empty generated files", () => {
    expect(() => decodeDeveloperFilePayload({ contentBase64: Buffer.from("   ").toString("base64") }, "src/test.ts")).toThrow(/no valid source content/i);
  });

  it("rejects NUL-containing text", () => {
    expect(() => decodeDeveloperFilePayload({ content: "a\u0000b" }, "src/test.ts")).toThrow(/NUL bytes/i);
  });

  it("rejects files over the configured byte limit", () => {
    expect(() => decodeDeveloperFilePayload({ content: "abcdef" }, "src/test.ts", 5)).toThrow(/too large/i);
  });
});
