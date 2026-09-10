import assert from 'node:assert/strict';
import fs from 'node:fs';

const expectedTargets = [
  'active_session',
  'prompt_context',
  'ai_memory',
  'cache',
  'search_index',
  'embedding',
  'vector',
  'derived_copy',
];

const path = new URL('./professional-share-invalidation-provenance-snapshot-20260910.json', import.meta.url);
const snapshot = JSON.parse(fs.readFileSync(path, 'utf8'));

assert.equal(snapshot.contract_version, 1);
assert.equal(snapshot.project_ref, 'aygawkavujjmybekswrg');
assert.equal(snapshot.scope, 'READ_ONLY_SCHEMA_EVIDENCE_ONLY');
assert.equal(snapshot.release_ready, false, 'read-only provenance inventory must not claim release readiness');
assert.ok(Array.isArray(snapshot.hosted_schema_observation?.direct_sharegrant_link_columns));
assert.equal(
  snapshot.hosted_schema_observation.direct_sharegrant_link_columns.length,
  0,
  'snapshot must fail closed while no direct ShareGrant linkage is proven',
);

const targets = snapshot.targets ?? [];
assert.deepEqual(targets.map((entry) => entry.target), expectedTargets);
assert.equal(new Set(targets.map((entry) => entry.target)).size, expectedTargets.length);

for (const entry of targets) {
  assert.equal(entry.status, 'BLOCKED_UNPROVEN', `${entry.target} must remain blocked until provenance is independently proven`);
  assert.equal(typeof entry.reason, 'string');
  assert.ok(entry.reason.trim().length > 0);
}

console.log('PROFESSIONAL_SHARE_INVALIDATION_PROVENANCE_CONTRACT_OK');
