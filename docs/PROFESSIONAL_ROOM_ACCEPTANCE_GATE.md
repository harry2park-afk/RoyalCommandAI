# Professional Room Acceptance Gate

Date: 2026-09-02 Australia/Sydney
Program: Legal + Accounting Professional Room
Contract: v2.3

No stage may claim SUCCESS unless the evidence required by that stage exists.

## Gate A — Phase 0 Contract Lock

- [x] Legal 10 fixed.
- [x] Accounting 8 fixed.
- [x] Specialty Pack preserved.
- [x] AI Secretary = Digital Worker.
- [x] High-risk judgment = Candidate -> Human Confirmation.
- [x] External side effect = DEFAULT DENY.
- [x] Legal Vault / Accounting Vault separated.
- [x] `bridge_la` fixed as coordination Product ID only.
- [x] Shared = ShareGrant Virtual View, not third datastore.
- [x] ShareGrant cascade covers Vector DB, Embedding, Search, Cache, Prompt Context, AI Memory, Derived Copy.
- [x] Unified Authority / Policy Engine fixed.
- [x] ApprovalGrant and DelegationGrant fixed and distinct.
- [x] Country Compliance Runtime / Jurisdictional Review Registry fixed.
- [x] Canonical ConnectorContract fixed.
- [x] Evidence Chain / Cost Governor / Usage Ledger / Exit portability fixed.
- [x] Telephony commercial/portability principles fixed.
- [x] existing RC locked surfaces preserved.
- [x] initial Phase 0 diff Host-verified documentation-only.

Phase 0 disposition: DESIGN LOCK ELIGIBLE.

## Gate B — Phase 1 Design Elaboration

- [x] exact 18-room catalog names/IDs defined.
- [x] Capability / Safety / Default ON-OFF Matrix defined.
- [x] `bridge_la` dual-catalog / single-internal-ID behavior defined.
- [x] Billing Metadata allowlist defined.
- [x] implementation Impact Map defined.
- [x] locked surfaces and additive boundaries defined.
- [x] Single Writer work-lane strategy defined.
- [x] mandatory implementation reviewers defined.

Phase 1 disposition: DESIGN BASELINE COMPLETE.

## Gate C — Pre-Implementation

Must be PASS before first HIGH-RISK implementation write:

- [ ] exact implementation batch selected.
- [ ] writable files/resources declared.
- [ ] exact base SHA recorded.
- [ ] Single Writer assigned for the batch.
- [ ] schema impact map completed if DB/RLS touched.
- [ ] threat model mapped to the batch.
- [ ] live Codex specialist review run against design/batch when authenticated route is available.
- [ ] any Codex P0 finding resolved before merge.
- [ ] at least one additional independent review perspective on high-risk implementation where practical.

## Gate D — Core Authority and Grants

Required evidence:

- [ ] RBAC + ABAC + Matter ACL evaluated server-side.
- [ ] Separation of Duties negative tests.
- [ ] ApprovalGrant scope/expiry/revocation tests.
- [ ] DelegationGrant non-expansion tests.
- [ ] formal approval cannot be spoofed by ordinary chat text.
- [ ] unknown/incomplete authority returns DENY/REVIEW, never implicit allow.
- [ ] cross-tenant access denied by server/RLS evidence.

## Gate E — Vault / ShareGrant

Required evidence:

- [ ] Legal payload inaccessible from Accounting-only context.
- [ ] Accounting payload inaccessible from Legal-only context.
- [ ] `bridge_la` does not merge storage.
- [ ] ShareGrant Virtual View resolves only authorised fields/objects.
- [ ] revoke/expiry invalidates Vector DB.
- [ ] revoke/expiry invalidates Embeddings.
- [ ] revoke/expiry invalidates Search Index.
- [ ] revoke/expiry invalidates Cache.
- [ ] revoke/expiry invalidates Prompt Context.
- [ ] revoke/expiry invalidates AI Memory.
- [ ] revoke/expiry invalidates Derived Copy/materialised derivative.
- [ ] invalidation is idempotent and evidence-producing.
- [ ] stale grant cannot continue retrieval after revocation.

## Gate F — Country Compliance / Connectors

- [ ] missing Country Pack => regulated/high-risk capability OFF.
- [ ] expired review => capability demoted OFF/REVIEW REQUIRED.
- [ ] BLOCKED/NOT_SUPPORTED cannot be overridden by room prompt.
- [ ] unverified provider contract => not Connected.
- [ ] ConnectorContract declares auth/data scope/side-effect/idempotency/retry/evidence/billing.
- [ ] retry cannot duplicate filing/payment/message/porting side effect.

## Gate G — 18 Room UI / Behavior

For every Legal 10 and Accounting 8 catalog entry:

- [ ] room opens without replacing locked native composer.
- [ ] existing conversation/history controls unchanged unless separately ordered.
- [ ] correct capability matrix resolved.
- [ ] correct vault boundary resolved.
- [ ] correct Country Pack state resolved.
- [ ] Candidate state visually distinct from approved/final state.
- [ ] OFF / LEGAL REVIEW REQUIRED / NOT CONNECTED states truthful.
- [ ] visible controls execute a real handler/API/state path; no decorative fake controls.
- [ ] language/localization follows Global Core patterns; no fixed-language-only professional control.

## Gate H — Evidence / Billing / Cost

- [ ] high-risk actions produce request/proposal/policy/approval/action/outcome chain.
- [ ] AI self-report is never treated as Host execution evidence.
- [ ] Usage Ledger records only needed charging metadata.
- [ ] Billing Engine cannot read vault payload bodies.
- [ ] cost/retry governor tested for runaway tasks.
- [ ] retries are safe against duplicate external side effects.

## Gate I — Telephony

Before any marketplace launch:

- [ ] exactly approved MVP provider(s); initial target 1 provider.
- [ ] only 1-2 legally/provider-verified countries enabled initially.
- [ ] customer-owned number path documented where supported.
- [ ] forwarding path verified before porting flow.
- [ ] direct carrier billing / RC management fee representation verified.
- [ ] no Connected state before provider agreement/connection evidence.
- [ ] recording/telecom compliance review verified per country.

## Gate J — Regression / Preview

- [ ] lint/typecheck/unit tests appropriate to changed code PASS.
- [ ] security/tenant isolation tests PASS.
- [ ] policy default-deny tests PASS.
- [ ] Vercel Preview READY on exact head.
- [ ] locked RC UI regression smoke PASS.
- [ ] existing Room IDs/history/memory/customer data preserved.
- [ ] no deleted button reappears because of stale/duplicate UI path.
- [ ] no unexpected overlay/floating panel regression.
- [ ] exact changed-file list matches declared scope.

## Gate K — Production

Production is BLOCKED until all applicable prior gates pass with exact-head Host evidence.

Before merge/deploy:

- [ ] PR diff reviewed.
- [ ] required CI checks PASS (not skipped/action_required).
- [ ] Preview PASS.
- [ ] rollback point recorded.
- [ ] production scope still matches owner-approved sequence.
- [ ] new legal/regulatory blocker absent.

After production:

- [ ] smoke test.
- [ ] auth/tenant isolation smoke.
- [ ] professional room catalog smoke.
- [ ] vault/ShareGrant smoke.
- [ ] logs/evidence/usage health check.
- [ ] known-good Stable Baseline recorded.

## Current execution status

Phase 0: complete as documentation/design baseline.
Phase 1 design: complete.
Implementation: NOT STARTED.
Production: NO CHANGE.
Live Codex implementation review: PENDING and mandatory before first HIGH-RISK implementation merge.
