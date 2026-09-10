import assert from 'node:assert/strict';
import {
  PROFESSIONAL_SHARE_INVALIDATION_TARGETS,
  processProfessionalShareInvalidationBatch,
} from './professional-share-invalidation-worker.mjs';

const EXPECTED_TARGETS = [
  'active_session',
  'prompt_context',
  'ai_memory',
  'cache',
  'search_index',
  'embedding',
  'vector',
  'derived_copy',
];

assert.deepEqual(
  PROFESSIONAL_SHARE_INVALIDATION_TARGETS,
  EXPECTED_TARGETS,
  'worker target order must stay aligned with the DB invalidation queue contract',
);

function makeJob(target, index = 0) {
  return {
    event_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    grant_id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    target,
    attempt_count: 1,
  };
}

function makeHarness(jobs) {
  const completions = [];
  const trace = [];
  const queue = {
    async claim(batchSize) {
      assert.ok(batchSize >= jobs.length);
      trace.push('claim');
      return jobs;
    },
    async loadContext(job) {
      trace.push(`context:${job.target}`);
      return {
        eventId: job.event_id,
        grantId: job.grant_id,
        target: job.target,
        tenantId: '20000000-0000-4000-8000-000000000001',
      };
    },
    async complete(result) {
      trace.push(`complete:${result.succeeded ? 'success' : 'failure'}:${jobs.find((job) => job.event_id === result.eventId)?.target ?? 'unknown'}`);
      completions.push(result);
    },
  };
  return { queue, completions, trace };
}

function makeAdapter(target, trace, overrides = {}) {
  return {
    idempotent: true,
    async erase() {
      trace.push(`erase:${target}`);
    },
    async verifyAbsent() {
      trace.push(`verify:${target}`);
      return { absent: true, evidenceRef: `readback://${target}/verified-absent` };
    },
    ...overrides,
  };
}

// Happy path: every target erases, read-backs, then and only then succeeds.
{
  const jobs = EXPECTED_TARGETS.map(makeJob);
  const { queue, completions, trace } = makeHarness(jobs);
  const adapters = Object.fromEntries(
    EXPECTED_TARGETS.map((target) => [target, makeAdapter(target, trace)]),
  );

  const results = await processProfessionalShareInvalidationBatch({
    queue,
    adapters,
    batchSize: 16,
  });

  assert.equal(results.length, 8);
  assert.equal(completions.length, 8);
  assert.ok(completions.every((row) => row.succeeded === true));
  assert.ok(completions.every((row) => typeof row.evidenceRef === 'string' && row.evidenceRef.length > 0));

  for (const target of EXPECTED_TARGETS) {
    const erase = trace.indexOf(`erase:${target}`);
    const verify = trace.indexOf(`verify:${target}`);
    const complete = trace.indexOf(`complete:success:${target}`);
    assert.ok(erase >= 0 && verify > erase && complete > verify, `${target} must erase -> verify absent -> succeed`);
  }
}

// Missing adapter must fail closed without a false success.
{
  const job = makeJob('vector', 20);
  const { queue, completions, trace } = makeHarness([job]);
  const results = await processProfessionalShareInvalidationBatch({ queue, adapters: {}, batchSize: 1 });
  assert.equal(results[0].code, 'UNCONFIGURED_TARGET_ADAPTER');
  assert.equal(completions[0].succeeded, false);
  assert.equal(trace.some((entry) => entry.startsWith('erase:')), false);
}

// Retry safety is mandatory: a non-idempotent adapter cannot run.
{
  const job = makeJob('cache', 21);
  const { queue, completions, trace } = makeHarness([job]);
  const adapters = { cache: makeAdapter('cache', trace, { idempotent: false }) };
  const results = await processProfessionalShareInvalidationBatch({ queue, adapters, batchSize: 1 });
  assert.equal(results[0].code, 'NON_IDEMPOTENT_TARGET_ADAPTER');
  assert.equal(completions[0].succeeded, false);
  assert.equal(trace.includes('erase:cache'), false);
}

// Erase exception must become failure, never success.
{
  const job = makeJob('embedding', 22);
  const { queue, completions, trace } = makeHarness([job]);
  const adapters = {
    embedding: makeAdapter('embedding', trace, {
      async erase() {
        trace.push('erase:embedding');
        throw new Error('simulated erase failure');
      },
    }),
  };
  const results = await processProfessionalShareInvalidationBatch({ queue, adapters, batchSize: 1 });
  assert.equal(results[0].code, 'ERASE_FAILED');
  assert.equal(completions[0].succeeded, false);
  assert.equal(completions.some((row) => row.succeeded === true), false);
}

// A read-back that still finds material must fail closed.
{
  const job = makeJob('ai_memory', 23);
  const { queue, completions, trace } = makeHarness([job]);
  const adapters = {
    ai_memory: makeAdapter('ai_memory', trace, {
      async verifyAbsent() {
        trace.push('verify:ai_memory');
        return { absent: false, evidenceRef: 'readback://ai_memory/still-present' };
      },
    }),
  };
  const results = await processProfessionalShareInvalidationBatch({ queue, adapters, batchSize: 1 });
  assert.equal(results[0].code, 'READBACK_NOT_ABSENT');
  assert.equal(completions[0].succeeded, false);
}

// Even a positive read-back cannot succeed without an evidence reference.
{
  const job = makeJob('search_index', 24);
  const { queue, completions, trace } = makeHarness([job]);
  const adapters = {
    search_index: makeAdapter('search_index', trace, {
      async verifyAbsent() {
        trace.push('verify:search_index');
        return { absent: true, evidenceRef: '   ' };
      },
    }),
  };
  const results = await processProfessionalShareInvalidationBatch({ queue, adapters, batchSize: 1 });
  assert.equal(results[0].code, 'MISSING_READBACK_EVIDENCE');
  assert.equal(completions[0].succeeded, false);
}

// Context cannot be rebound to another grant/tenant lane.
{
  const job = makeJob('prompt_context', 25);
  const { queue, completions, trace } = makeHarness([job]);
  queue.loadContext = async () => ({
    eventId: job.event_id,
    grantId: '10000000-0000-4000-8000-999999999999',
    target: job.target,
    tenantId: '20000000-0000-4000-8000-000000000001',
  });
  const adapters = { prompt_context: makeAdapter('prompt_context', trace) };
  const results = await processProfessionalShareInvalidationBatch({ queue, adapters, batchSize: 1 });
  assert.equal(results[0].code, 'GRANT_CONTEXT_MISMATCH');
  assert.equal(completions[0].succeeded, false);
  assert.equal(trace.includes('erase:prompt_context'), false);
}

// Unknown target identity must fail before any storage adapter can run.
{
  const job = { ...makeJob('vector', 26), target: 'untrusted_target' };
  const { queue, completions } = makeHarness([job]);
  const results = await processProfessionalShareInvalidationBatch({ queue, adapters: {}, batchSize: 1 });
  assert.equal(results[0].code, 'UNKNOWN_TARGET');
  assert.equal(completions[0].succeeded, false);
}

console.log('PROFESSIONAL_SHARE_INVALIDATION_WORKER_CONTRACT_OK');
