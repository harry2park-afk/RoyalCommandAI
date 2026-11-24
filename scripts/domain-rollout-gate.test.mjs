import assert from "node:assert/strict";
import test from "node:test";
import { classifyDomainRollout } from "./domain-rollout-gate.mjs";

const disabled = { assets: [{ domain: "example.test", runtimeEnabled: false, runtimeBinding: null }] };

test("ordinary UI, docs and Room work skips the domain gate", () => {
  assert.equal(classifyDomainRollout({ paths: ["src/app/rooms/rca/page.tsx", "docs/README.md"] }).mode, "SKIP");
});

test("disabled Pack preparation uses FAST", () => {
  assert.equal(classifyDomainRollout({ paths: ["src/config/countries/de.json"], readyTransitions: false }).mode, "FAST");
  assert.equal(classifyDomainRollout({ paths: ["src/config/domainAssets.json"], beforeAssets: disabled, afterAssets: disabled }).mode, "FAST");
});

test("activation and domain control changes use HIGH", () => {
  const enabled = { assets: [{ domain: "example.test", runtimeEnabled: true, runtimeBinding: "DE", activationChecks: {} }] };
  const activation = classifyDomainRollout({ paths: ["src/config/domainAssets.json"], beforeAssets: disabled, afterAssets: enabled });
  assert.equal(activation.mode, "HIGH");
  assert.equal(activation.activation, true);
  assert.equal(classifyDomainRollout({ paths: ["src/config/policies/de.json"], readyTransitions: true }).mode, "HIGH");
  assert.equal(classifyDomainRollout({ paths: ["src/app/api/auth/login/route.ts"] }).mode, "HIGH");
});
