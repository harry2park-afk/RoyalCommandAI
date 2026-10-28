import { describe, expect, it } from "vitest";
import inventory from "./domainAssets.json";
import { getDomainRuntimeContext, isDomainFeatureReady } from "./countryResolver";
import { getCountryPack, getPolicyPack, getRegionPack, listCountryPacks } from "./packRegistry";

describe("automatic domain pack registry", () => {
  it("discovers country, region and policy packs", () => {
    expect(listCountryPacks().map((pack) => pack.packId).sort()).toEqual([
      "country-au", "country-ca", "country-gb", "country-jp", "country-kr", "country-us",
    ]);
    expect(getRegionPack("region-global")?.status).toBe("READY");
    expect(getPolicyPack("policy-au")?.features.legal).toBe("NEEDS_REVIEW");
  });

  it("composes every enabled domain and rejects every disabled domain", () => {
    for (const asset of inventory.assets) {
      const context = getDomainRuntimeContext(asset.domain, "production");
      if (asset.runtimeEnabled) expect(context, asset.domain).not.toBeNull();
      else expect(context, asset.domain).toBeNull();
    }
  });

  it("applies Core, Region, Country and Policy without enabling unreviewed features", () => {
    const au = getDomainRuntimeContext("atyourcommandai.com.au", "production");
    expect(au).toMatchObject({
      regionPackId: "region-au", countryPackId: "country-au", policyPackId: "policy-au",
      locale: "en-AU", currency: "AUD", phoneCountryCode: "+61",
    });
    expect(au && isDomainFeatureReady(au, "ai")).toBe(true);
    expect(au && isDomainFeatureReady(au, "legal")).toBe(false);
    expect(getCountryPack("country-au")?.countryCode).toBe("AU");
  });
});
