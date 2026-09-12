import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const FAST_PATH = /^(src\/config\/(domainAssets\.json|countries\/|regions\/|policies\/|packs\/|generated\/|packRegistry)|scripts\/generate-domain-pack-registry\.mjs)/;
const HIGH_CONTROL_PATH = /^(src\/config\/(domainRegistry|countryResolver)|src\/middleware\.ts|src\/lib\/supabase\/middleware\.ts|src\/app\/api\/auth\/|src\/lib\/google-workspace\/|src\/app\/api\/tools\/google\/(connect|callback)\/|vercel\.json$|\.github\/workflows\/domain-rollout-gate\.yml$|scripts\/domain-rollout-gate\.mjs$)/;

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function existsAt(ref, path) {
  try { git(["cat-file", "-e", `${ref}:${path}`]); return true; } catch { return false; }
}

function changedToReady(before, after) {
  if (after === "READY") return before !== "READY";
  if (!after || typeof after !== "object") return false;
  return Object.keys(after).some((key) => changedToReady(before && typeof before === "object" ? before[key] : undefined, after[key]));
}

function activationChanged(before, after) {
  const oldByDomain = new Map((before?.assets || []).map((asset) => [asset.domain, asset]));
  return (after?.assets || []).some((asset) => {
    const old = oldByDomain.get(asset.domain);
    if (!old) return asset.runtimeEnabled === true;
    return old.runtimeEnabled !== asset.runtimeEnabled
      || old.runtimeBinding !== asset.runtimeBinding
      || JSON.stringify(old.activationChecks || null) !== JSON.stringify(asset.activationChecks || null);
  });
}

export function classifyDomainRollout({ paths, beforeAssets, afterAssets, readyTransitions = false }) {
  const relevant = paths.filter((path) => FAST_PATH.test(path) || HIGH_CONTROL_PATH.test(path));
  const activation = Boolean(beforeAssets && afterAssets && activationChanged(beforeAssets, afterAssets));
  if (!relevant.length) return { mode: "SKIP", relevant, activation: false };
  if (activation) return { mode: "HIGH", relevant, activation: true };
  if (relevant.some((path) => HIGH_CONTROL_PATH.test(path))) return { mode: "HIGH", relevant, activation: false };
  if (readyTransitions) return { mode: "HIGH", relevant, activation: false };
  return { mode: "FAST", relevant, activation: false };
}

function jsonAt(ref, path) {
  try { return JSON.parse(git(["show", `${ref}:${path}`])); } catch { return null; }
}

function packReadyTransition(base, head, paths, afterAssets) {
  const activePackIds = new Set((afterAssets?.assets || [])
    .filter((asset) => asset.runtimeEnabled === true)
    .flatMap((asset) => [asset.countryPackId, asset.policyPackId, asset.region ? `region-${asset.region}` : null])
    .filter(Boolean));
  return paths.filter((path) => /^src\/config\/(countries|regions|policies)\/.*\.json$/.test(path)).some((path) => {
    const before = jsonAt(base, path);
    const after = jsonAt(head, path);
    return activePackIds.has(after?.id) && changedToReady(before, after);
  });
}

function validateEvidence(result, enforce) {
  if (!result.activation || !enforce) return;
  const evidence = process.env.DOMAIN_ROLLOUT_EVIDENCE || "";
  const required = ["Preview", "Rollback", "Auth", "DNS", "TLS", "Vercel"];
  const missing = required.filter((label) => !new RegExp(`${label}\\s*:`, "i").test(evidence));
  if (missing.length) throw new Error(`HIGH Domain Rollout requires evidence fields: ${missing.join(", ")}`);
}

function main() {
  const base = process.env.DOMAIN_GATE_BASE || "HEAD^";
  const head = process.env.DOMAIN_GATE_HEAD || "HEAD";
  const paths = git(["diff", "--name-only", base, head]).split(/\r?\n/).filter(Boolean);
  const beforeAssets = jsonAt(base, "src/config/domainAssets.json");
  const afterAssets = jsonAt(head, "src/config/domainAssets.json") || JSON.parse(readFileSync("src/config/domainAssets.json", "utf8"));
  const result = classifyDomainRollout({ paths, beforeAssets, afterAssets, readyTransitions: packReadyTransition(base, head, paths, afterAssets) });
  // Do not apply a new Gate retroactively to all changes in the PR that introduces it.
  // Every later activation change is enforced because the Gate then exists at the base ref.
  validateEvidence(result, existsAt(base, ".github/workflows/domain-rollout-gate.yml"));
  console.log(`Domain Rollout Gate: ${result.mode}`);
  if (result.relevant.length) console.log(`Relevant files: ${result.relevant.join(", ")}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `mode=${result.mode}\nrelevant=${result.relevant.join(",")}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }
}
