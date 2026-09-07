import { describe, expect, it } from "vitest";
import { getDomainAsset, listDomainAssets, resolveRuntimeDomain } from "./domainRegistry";

describe("domain runtime registry", () => {
  it("keeps the complete 22-domain inventory", () => {
    expect(listDomainAssets()).toHaveLength(22);
    expect(new Set(listDomainAssets().map((asset) => asset.domain)).size).toBe(22);
  });

  it("activates only checked runtime bindings", () => {
    expect(resolveRuntimeDomain("royalcommand.ai", "production")).toMatchObject({ allowed: true, binding: "GLOBAL" });
    expect(resolveRuntimeDomain("www.atyourcommandai.com.au", "production")).toMatchObject({ allowed: true, binding: "AU" });
    expect(resolveRuntimeDomain("atyourcommandai.com", "production")).toMatchObject({ allowed: true, binding: "US" });
  });

  it("fails closed for disabled and unknown production domains", () => {
    expect(resolveRuntimeDomain("royalcommandai.jp", "production")).toMatchObject({ allowed: false, reason: "runtime_disabled" });
    expect(resolveRuntimeDomain("unknown.example", "production")).toMatchObject({ allowed: false, reason: "unknown_domain" });
    for (const asset of listDomainAssets().filter((entry) => !entry.runtimeEnabled)) {
      expect(resolveRuntimeDomain(asset.domain, "production"), asset.domain).toMatchObject({ allowed: false, reason: "runtime_disabled" });
    }
  });

  it("allows Preview and development hosts without activating an asset", () => {
    expect(resolveRuntimeDomain("branch-project.vercel.app", "preview")).toMatchObject({ allowed: true, binding: "GLOBAL", source: "preview" });
    expect(resolveRuntimeDomain("localhost:3000", "development")).toMatchObject({ allowed: true, binding: "GLOBAL", source: "development" });
  });

  it("uses apex metadata for its www alias", () => {
    expect(getDomainAsset("WWW.ROYALCOMMAND.AI:443")?.domain).toBe("royalcommand.ai");
  });
});
