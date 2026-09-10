export const PROFESSIONAL_SHARE_INVALIDATION_TARGETS = Object.freeze([
  'active_session',
  'prompt_context',
  'ai_memory',
  'cache',
  'search_index',
  'embedding',
  'vector',
  'derived_copy',
]);

const TARGET_SET = new Set(PROFESSIONAL_SHARE_INVALIDATION_TARGETS);

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateQueue(queue) {
  for (const method of ['claim', 'loadContext', 'complete']) {
    if (typeof queue?.[method] !== 'function') {
      throw new TypeError(`queue.${method} must be a function`);
    }
  }
}

function validateClaim(job) {
  if (!job || typeof job !== 'object') return 'INVALID_CLAIM';
  if (!nonEmptyString(job.event_id)) return 'INVALID_EVENT_ID';
  if (!nonEmptyString(job.grant_id)) return 'INVALID_GRANT_ID';
  if (!nonEmptyString(job.target) || !TARGET_SET.has(job.target)) return 'UNKNOWN_TARGET';
  return null;
}

function validateContext(job, context) {
  if (!context || typeof context !== 'object') return 'MISSING_CONTEXT';
  if (context.eventId !== job.event_id) return 'EVENT_CONTEXT_MISMATCH';
  if (context.grantId !== job.grant_id) return 'GRANT_CONTEXT_MISMATCH';
  if (context.target !== job.target) return 'TARGET_CONTEXT_MISMATCH';
  if (!nonEmptyString(context.tenantId)) return 'MISSING_TENANT_CONTEXT';
  return null;
}

async function completeFailure(queue, job, code) {
  // Persist only a stable failure code. Provider/storage exception text can
  // contain internal identifiers or secrets and must not enter the evidence DB.
  await queue.complete({
    eventId: job?.event_id,
    succeeded: false,
    error: code,
    evidenceRef: null,
  });
  return {
    eventId: job?.event_id ?? null,
    target: job?.target ?? null,
    status: 'failed',
    code,
  };
}

async function processOne({ queue, adapters, job }) {
  const claimError = validateClaim(job);
  if (claimError) {
    if (!nonEmptyString(job?.event_id)) {
      throw new Error(`BLOCKED_${claimError}`);
    }
    return completeFailure(queue, job, claimError);
  }

  const adapter = adapters?.[job.target];
  if (!adapter || typeof adapter.erase !== 'function' || typeof adapter.verifyAbsent !== 'function') {
    return completeFailure(queue, job, 'UNCONFIGURED_TARGET_ADAPTER');
  }
  if (adapter.idempotent !== true) {
    return completeFailure(queue, job, 'NON_IDEMPOTENT_TARGET_ADAPTER');
  }

  let context;
  try {
    context = await queue.loadContext(job);
  } catch {
    return completeFailure(queue, job, 'CONTEXT_LOAD_FAILED');
  }

  const contextError = validateContext(job, context);
  if (contextError) {
    return completeFailure(queue, job, contextError);
  }

  try {
    await adapter.erase(context);
  } catch {
    return completeFailure(queue, job, 'ERASE_FAILED');
  }

  let proof;
  try {
    proof = await adapter.verifyAbsent(context);
  } catch {
    return completeFailure(queue, job, 'READBACK_FAILED');
  }

  if (proof?.absent !== true) {
    return completeFailure(queue, job, 'READBACK_NOT_ABSENT');
  }
  if (!nonEmptyString(proof.evidenceRef)) {
    return completeFailure(queue, job, 'MISSING_READBACK_EVIDENCE');
  }

  await queue.complete({
    eventId: job.event_id,
    succeeded: true,
    error: null,
    evidenceRef: proof.evidenceRef.trim(),
  });

  return {
    eventId: job.event_id,
    target: job.target,
    status: 'succeeded',
    evidenceRef: proof.evidenceRef.trim(),
  };
}

/**
 * Trusted-worker control contract for Professional ShareGrant invalidation.
 *
 * This module intentionally does not know any production credentials or storage
 * implementation. Runtime wiring must inject:
 *   queue.claim(batchSize) -> claimed DB events
 *   queue.loadContext(job) -> authoritative tenant/grant/target context
 *   queue.complete(result) -> service-role completion RPC
 *   adapters[target] -> { idempotent: true, erase(context), verifyAbsent(context) }
 *
 * A job can be marked succeeded only after target-specific erase completes and a
 * separate read-back returns { absent: true, evidenceRef: <non-empty> }.
 * Missing/unknown/non-idempotent adapters fail closed and never produce success.
 * Failure persistence uses stable codes only; raw downstream exceptions are not
 * written into the evidence database.
 */
export async function processProfessionalShareInvalidationBatch({
  queue,
  adapters,
  batchSize = 16,
} = {}) {
  validateQueue(queue);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new RangeError('batchSize must be an integer between 1 and 100');
  }

  const jobs = await queue.claim(batchSize);
  if (!Array.isArray(jobs)) {
    throw new TypeError('queue.claim must return an array');
  }

  const results = [];
  for (const job of jobs) {
    results.push(await processOne({ queue, adapters, job }));
  }
  return results;
}
