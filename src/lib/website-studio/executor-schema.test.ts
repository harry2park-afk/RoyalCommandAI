import { describe, expect, it } from "vitest";
import { planSchema } from "./executor";

describe("Website Studio design outcomes", () => {
  it("accepts a supported design with at least one approved candidate path", () => {
    expect(planSchema.parse({ outcome: "accepted", summary: "Update the panel label", paths: ["src/components/website-studio/StudioWorkPanels.tsx"], checks: ["panels_present"] }).outcome).toBe("accepted");
  });

  it("accepts an unsupported result without inventing a writable path", () => {
    expect(planSchema.parse({ outcome: "unsupported", summary: "This request is outside the current Studio authority", reason: "It requires executable logic changes" }).outcome).toBe("unsupported");
  });

  it("rejects an accepted result with no candidate path", () => {
    expect(() => planSchema.parse({ outcome: "accepted", summary: "Invalid", paths: [], checks: ["panels_present"] })).toThrow();
  });
});
