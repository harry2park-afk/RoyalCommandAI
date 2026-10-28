import inventory from "./domainAssets.json";

export type RuntimeBinding = "GLOBAL" | string;

export type DomainActivationChecks = {
  ownership: boolean;
  dns: boolean;
  tls: boolean;
  vercel: boolean;
  auth: boolean;
};

export type DomainAsset = {
  domain: string;
  countryCode: string | null;
  regionCode: string;
  defaultLocale: string | null;
  currency: string | null;
  countryPackId: string | null;
  policyPackId: string | null;
  runtimeEnabled: boolean;
  runtimeBinding: RuntimeBinding | null;
  activationChecks?: DomainActivationChecks;
};

export type RuntimeDomainResolution = {
  allowed: boolean;
  hostname: string;
  asset: DomainAsset | null;
  binding: RuntimeBinding | null;
  source: "registry" | "preview" | "development" | "blocked";
  reason?: "unknown_domain" | "runtime_disabled" | "missing_binding" | "invalid_binding" | "activation_checks_incomplete";
};

const assets = inventory.assets as DomainAsset[];
const byDomain = new Map(assets.map((asset) => [asset.domain.toLowerCase(), asset]));

export function normalizeDomainHostname(value: string) {
  return value.trim().toLowerCase().split(",", 1)[0].split(":", 1)[0].replace(/\.$/, "");
}

export function listDomainAssets(): readonly DomainAsset[] {
  return assets;
}

export function getDomainAsset(hostname: string): DomainAsset | null {
  const normalized = normalizeDomainHostname(hostname);
  return byDomain.get(normalized) || (normalized.startsWith("www.") ? byDomain.get(normalized.slice(4)) : null) || null;
}

function checksComplete(checks?: DomainActivationChecks) {
  return Boolean(checks && Object.values(checks).every(Boolean));
}

export function resolveRuntimeDomain(hostname: string, vercelEnv = process.env.VERCEL_ENV): RuntimeDomainResolution {
  const normalized = normalizeDomainHostname(hostname);
  if (vercelEnv !== "production" && (normalized === "localhost" || normalized === "127.0.0.1")) {
    return { allowed: true, hostname: normalized, asset: null, binding: "GLOBAL", source: "development" };
  }
  if (vercelEnv === "preview" && normalized.endsWith(".vercel.app")) {
    return { allowed: true, hostname: normalized, asset: null, binding: "GLOBAL", source: "preview" };
  }

  const asset = getDomainAsset(normalized);
  if (!asset) return { allowed: false, hostname: normalized, asset: null, binding: null, source: "blocked", reason: "unknown_domain" };
  if (!asset.runtimeEnabled) return { allowed: false, hostname: normalized, asset, binding: null, source: "blocked", reason: "runtime_disabled" };
  if (!asset.runtimeBinding) return { allowed: false, hostname: normalized, asset, binding: null, source: "blocked", reason: "missing_binding" };
  if (asset.runtimeBinding !== "GLOBAL" && asset.countryCode !== asset.runtimeBinding) {
    return { allowed: false, hostname: normalized, asset, binding: null, source: "blocked", reason: "invalid_binding" };
  }
  if (!checksComplete(asset.activationChecks)) {
    return { allowed: false, hostname: normalized, asset, binding: null, source: "blocked", reason: "activation_checks_incomplete" };
  }
  return { allowed: true, hostname: normalized, asset, binding: asset.runtimeBinding, source: "registry" };
}
