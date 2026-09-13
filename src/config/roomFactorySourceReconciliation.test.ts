import { describe, expect, it } from "vitest";
import { evaluateRoomFactorySourceReconciliation } from "./roomFactorySourceReconciliation";

describe("Room Factory source reconciliation", () => {
  it("keeps the candidate source internally complete", () => {
    const result = evaluateRoomFactorySourceReconciliation([]);

    expect(result.sourceTemplatesMissingDomainProfiles).toEqual([]);
  });

  it("fails closed when the Hosted snapshot contains a template absent from the candidate source", () => {
    const result = evaluateRoomFactorySourceReconciliation(["legal", "custom", "website", "unknown-hosted-template"]);

    expect(result.consistent).toBe(false);
    expect(result.hostedTemplatesMissingFromSource).toEqual(["unknown-hosted-template"]);
  });

  it("reconciles the fresh Hosted legal/custom/website template inventory", () => {
    // Fresh Hosted READ-ONLY evidence on 2026-09-14 contains legal, custom and website manifests.
    const result = evaluateRoomFactorySourceReconciliation(["legal", "custom", "website"]);

    expect(result.consistent).toBe(true);
    expect(result.hostedTemplatesMissingFromSource).toEqual([]);
  });
});
