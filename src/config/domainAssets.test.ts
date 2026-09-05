import { describe, expect, it } from "vitest";
import domainAssets from "./domainAssets.json";
import { getCountryCodeByDomain } from "./countryResolver";

type DomainAsset = {
  domain: string;
  source: string;
  runtimeEnabled: boolean;
  runtimeBinding: string | null;
};

type DomainAssetRegistry = {
  assets: DomainAsset[];
  observedRuntimeAliasesNotClaimedAsOwnedAssets: Array<{
    domain: string;
    runtimeBinding: string;
  }>;
};

const registry = domainAssets as DomainAssetRegistry;
const newlyAcquiredFirstWaveDomains = [
  "royalcommandai.au",
  "royalcommandai.com.au",
  "royalcommandai.co.uk",
  "royalcommandai.uk",
  "royalcommandai.jp",
  "royalcommandai.kr",
] as const;

describe("domain asset launch safety", () => {
  it("keeps every newly acquired asset fail-closed until runtime activation is separately verified", () => {
    for (const asset of registry.assets) {
      if (asset.source === "existing-rc-master") continue;

      expect(asset.runtimeEnabled, asset.domain).toBe(false);
      expect(asset.runtimeBinding, asset.domain).toBeNull();
    }
  });

  it("keeps the acquired first-wave brand domains disabled", () => {
    const assetsByDomain = new Map(registry.assets.map((asset) => [asset.domain, asset]));

    for (const domain of newlyAcquiredFirstWaveDomains) {
      const asset = assetsByDomain.get(domain);
      expect(asset, domain).toBeDefined();
      expect(asset!.runtimeEnabled, domain).toBe(false);
      expect(asset!.runtimeBinding, domain).toBeNull();
    }
  });

  it("requires every enabled owned asset to agree with the runtime resolver", () => {
    for (const asset of registry.assets.filter((candidate) => candidate.runtimeEnabled)) {
      expect(asset.runtimeBinding, asset.domain).not.toBeNull();
      expect(getCountryCodeByDomain(asset.domain), asset.domain).toBe(asset.runtimeBinding);
    }
  });

  it("does not silently count observed aliases as owned assets", () => {
    const ownedDomains = new Set(registry.assets.map((asset) => asset.domain));

    for (const observed of registry.observedRuntimeAliasesNotClaimedAsOwnedAssets) {
      expect(ownedDomains.has(observed.domain), observed.domain).toBe(false);
      expect(getCountryCodeByDomain(observed.domain), observed.domain).toBe(
        observed.runtimeBinding,
      );
    }
  });
});
