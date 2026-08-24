# Royal Command RC Room V2 — Phase 0 Contracts

**Work ID:** RC-20260825-PHASE0-CONTRACTS  
**Specification:** REV-02 FINAL INTEGRATED  
**Status:** Phase 0 contract baseline  
**Production effect:** None. This phase defines contracts only.

## Purpose

Phase 0 converts the approved REV-02 FINAL INTEGRATED architecture into normative contracts before Phase 1 changes runtime behavior.

The runtime truth remains with Royal Command Host/DB. AI workers are replaceable and may only propose side effects. Tool Gateway remains the only execution authority.

## 1. Work Mode Contract

Modes: `CHAT`, `ANALYSE`, `RESEARCH`, `DEVELOP`, `TOOL_TASK`, `BENCHMARK`.

Decision priority:

1. User explicit instruction
2. UI explicit control
3. Work continuation metadata
4. Host routing policy
5. Automatic classifier

Classifier failure or confidence below threshold defaults to `CHAT`.

Side-effect boundary rule: after a side effect begins, a mode change must create a new revision or work item. Evidence may not be mixed across incompatible mode revisions.

## 2. Council Contract

Council is never an automatic work mode. Default is `off`. Manual Council is `manual_once` and must be explicitly triggered by user/UI control.

Council uses actual completed independent results only. Missing, timeout, failed, or pending providers must not be fabricated as participants.

## 3. Work State Contract

Allowed states:

`CREATED → RUNNING → PARTIAL / WAITING_APPROVAL / COMPLETED / FAILED / CANCELLED`

Provider-level result states remain metadata: `SUCCESS`, `PARTIAL`, `TIMEOUT`, `FAILED`, `LATE`, `CANCELLED`.

Evidence must be written and validated before completion-related state transitions.

## 4. Evidence Contract

Minimum required evidence:

| Mode | Required evidence |
|---|---|
| CHAT | RESPONSE |
| ANALYSE | RESPONSE |
| RESEARCH | RESPONSE + SOURCE |
| TOOL_TASK | TOOL_RESULT |
| DEVELOP | CODE_CHANGE + TEST + COMMIT + PULL_REQUEST + PREVIEW |
| BENCHMARK | RESPONSE |

Production additionally requires user approval, approved SHA, final SHA revalidation and deployment evidence.

Evidence records must include Work ID, revision, timestamp and a stable Evidence ID. Secret/PII redaction is mandatory before persistence.

## 5. Provider Adapter Contract

Every provider adapter must normalize:

- start
- stream
- cancel
- deadline/timeout propagation
- partial result
- final result
- token usage
- provider/model metadata
- normalized errors
- retry eligibility

Normalized errors include: `AUTH_ERROR`, `RATE_LIMIT`, `CREDIT_EXHAUSTED`, `TIMEOUT`, `PROVIDER_DOWN`, `MODEL_UNAVAILABLE`, `CONTEXT_OVERFLOW`, `CANCELLED`, `UNKNOWN`.

Every provider result receives a Result ID for reconnect deduplication.

## 6. ACK Critical Path

Synchronous allowlist before ACK:

- minimal auth check
- Work ID create/lookup
- explicit mode/Council control read
- cached feature flag read
- cached provider snapshot read

Do not synchronously run before ACK:

- long history retrieval
- embedding generation
- full context assembly
- real-time cost reconciliation
- detailed health calculation
- large DB scans
- benchmark work

## 7. Execution Lane Isolation

Lanes: `INTERACTIVE`, `COUNCIL`, `DEVELOPMENT`, `BENCHMARK`.

Each lane requires independent limits for concurrency, queue depth, timeout, credential scope and rate-limit key. Benchmark is deliberately constrained and must not degrade Interactive work.

Initial values live in `src/lib/ai/v2Contracts.ts` and are operational defaults, not permanent capacity guarantees.

## 8. Tool Gateway Contract

AI and Dev Agent submit proposals only.

`AI / Dev Agent → Proposal → Tool Gateway → Validation → Authorization → Execution → Evidence`

Risk classes:

- R0: Read only
- R1: Safe/reversible write
- R2: External side effect
- R3: Production/destructive

R3 requires explicit user approval. Benchmark is R0-only by baseline. Chat is R0-only by baseline.

Tool arguments must be structurally validated and sanitized for path traversal, shell/git injection, URL/repository scope, branch/path allowlists, secrets and tenant/room scope.

Side-effecting operations require idempotency keys.

## 9. Approval Lease Contract

Approval is bound to one Work ID, revision, preview and exact SHA.

Production preflight requires:

`Approved SHA = PR Head SHA = Preview SHA = Deployment Source SHA`

Lease invalidation occurs on expiry, force push, rebase, new commit, PR head change, preview mismatch/expiry or critical test change.

## 10. Cancellation Contract

Cancellation behavior is explicitly different by operation type. Provider inference and streaming should abort/stop delivery. Safe writes preserve already-completed results. External effects may require cleanup. Production/destructive effects require revert/rollback rather than pretending cancellation erased the action.

Orphan branches/previews are cleanup-job candidates; existing evidence is retained.

## 11. Auth/SSE Contract

Auth refresh uses single-flight coordination per token/session generation. No refresh storm or infinite retry is allowed.

SSE is notification only. Host/DB owns Work State. Reconnect is Work-ID based and Result-ID deduplicated.

## 12. Failure UX Contract

User-facing statuses are simple and stable: Working, Completed, Partial, Timed Out, Unavailable, Authentication Required, Credit Limit Reached, Cancelled, Backup Provider Used.

Internal normalized error codes stay in admin/telemetry surfaces.

## 13. Telemetry/SLO Baseline

Minimum telemetry includes request/ACK/routing/provider/first-token/tool/commit/preview/completion timestamps plus retry, fallback, timeout, token, cost, provider and model data.

Initial targets are encoded in the contract module. Targets are measured separately for RC overhead and provider latency.

## 14. Shadow Truth Contract

V1 and V2 must share the same Room ID, Work ID namespace, revision meaning and Evidence reference policy. Shadow paths are side-effect free by default.

No-Go if truth divergence or correctness regression is detected. Initial latency/failure/cost thresholds are encoded in `shadowGoNoGo` and must be tuned with production evidence before broad rollout.

## 15. Dev Agent Phase 6 Entrance Gate

Before execution activation, Dev Agent must pass an audit covering auth/authz, Work ID/revision validation, branch safety, direct-master blocking, traversal/injection, secret leakage, duplicate execution, races/conflicts, timeout/cancellation, evidence correctness and Preview/Approval SHA mapping.

A critical failure blocks Dev Agent execution activation.

## Phase 0 Exit Criteria

Phase 0 is complete when:

- contract module compiles in Preview
- contract document is reviewed
- no existing runtime path is changed
- Preview is READY
- user approves merge/Production

After Phase 0 Production approval, proceed to **Phase 1 — Speed Spine** only.
