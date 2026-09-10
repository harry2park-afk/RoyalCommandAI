# Professional Room Vault / ShareGrant — Schema Impact Map

Date: 2026-09-10 Australia/Sydney  
Program: Royal Command Legal + Accounting Professional Rooms  
Governing design: Professional Room Design Contract v2.3  
Risk: HIGH-RISK / AUTHORIZATION / TENANT ISOLATION / CUSTOMER DATA  
Status: DESIGN / IMPACT MAP ONLY — NO DATABASE IMPLEMENTATION AUTHORITY

## 1. Purpose

Prepare the mandatory database impact map required before any persistent Legal Vault / Accounting Vault / ShareGrant implementation.

This document does not create a migration, does not approve table names, does not change RLS, does not alter Hosted Supabase, does not expose Professional Rooms in Create Room, and does not authorize Production deployment.

The existing v2.3 contract remains authoritative:

- Legal Vault and Accounting Vault stay separate.
- `bridge_la` is one Product ID only; it never merges vault storage.
- Shared access is a ShareGrant-authorized Virtual View, not a third Shared Vault.
- ShareGrant revoke/expiry must invalidate every derived retrieval path.
- Billing receives minimum billing metadata only and never vault payload bodies.
- unknown/incomplete authority fails closed.

## 2. Exact baseline and restore

Protected baseline used for this impact map:

`33da2a917dc6adcf266f59f0b27d18a56f1271d8`

Restore anchor:

`restore/2026-09-10-1347-master-vault-sharegrant-design`

No direct write to `master` is permitted from this work lane.

## 3. Existing Hosted schema evidence — READ ONLY

Fresh Hosted inspection on 2026-09-10 found the following current storage/access primitives:

### Core Room ownership

- `households`: `id`, `owner_id`, `household_type`, timestamps.
- `household_members`: `household_id`, `user_id`, `role`.
- `rooms`: `id`, `household_id`, `room_owner_id`, room state/timestamps.
- `room_members`: `room_id`, `user_id`, `role`, `language_pref`.
- all four currently have RLS enabled.

Current Room policies use owner, household membership and Room membership checks. This proves existing ownership/membership primitives exist, but it does not by itself prove that `household_id` is the canonical Global Core tenant/org identity required by the v2.3 contract.

### Existing Legal data

Observed Legal tables include:

- `legal_room_workspaces`
- `legal_cases`
- `legal_evidence_items`
- `legal_story_entries`

They currently carry `room_id` and `owner_id` ownership fields. The inspected `legal_room_workspaces` RLS is owner/Room-owner scoped.

No Accounting-specific persistent workspace/vault table was observed in the same Hosted inventory.

### Matter data

Observed Matter tables include:

- `matters`
- `matter_documents`
- `matter_messages`
- `matter_chat_reads`

The current October launch evidence still shows ordinary authenticated authority on protected Matter ownership/assignment columns until the separate Matter hardening candidate is controlled-staged and behaviorally verified.

### Room Factory metadata

`room_factory_manifests` currently contains:

- `room_id`
- `owner_id`
- `factory_version`
- `template_id`
- `country_code`
- `language_tag`
- `country_profile_status`
- `manifest`
- optional `encounter_session_id`

This is creation/configuration metadata and must not become a substitute vault or a place to embed protected professional payloads.

### Vault / ShareGrant persistence inventory

No public Hosted table matching current `vault`, `sharegrant` or `share_grant` persistence naming was observed.

Therefore persistent v2.3 Gate E evidence is currently NOT IMPLEMENTED / NOT VERIFIED on Hosted.

## 4. P0 ambiguity that blocks a migration

The v2.3 contract requires a tenant/org key on every tenant-owned professional object.

Current inspected Room storage exposes:

- `household_id`
- `room_owner_id`
- `room_id`
- membership tables

but no verified canonical `tenant_id` / `org_id` / `organization_id` authority was identified in the inspected core schema.

This must be resolved before a Vault/ShareGrant migration is written.

**Fail-closed rule:** do not guess that `household_id` is the Global Core tenant/org key. Either:

1. prove by existing repository/architecture authority that Household is the canonical tenant boundary; or
2. define and review a canonical tenant/org mapping before schema implementation.

Until then, DB implementation remains BLOCKED.

## 5. Required logical data domains

The following are logical responsibilities required by v2.3. Names below are domain labels, not approved SQL table names.

### A. Vault Identity

Must identify:

- owning tenant/org boundary;
- owning Room;
- professional domain = Legal or Accounting;
- source owner/authority;
- lifecycle/status;
- policy version/evidence reference.

A `bridge_la` record may reference both domain identities for coordination, but may not become a payload container.

### B. Vault Object / Payload Reference

Must keep protected professional payload in the source vault domain and carry enough metadata for authorization without exposing payload to unrelated systems.

Requirements:

- explicit source vault identity;
- explicit Room/tenant ownership;
- explicit classification/object type;
- immutable/stable object identity suitable for ShareGrant scope;
- no implicit cross-domain read;
- retention/deletion behavior consistent with source policy.

### C. ShareGrant

Must record at minimum:

- grant identity;
- source vault/object scope;
- authorised destination/context;
- actor/grantor authority;
- permitted fields/objects/actions;
- purpose where policy requires it;
- created/active/expiry/revoked timestamps;
- revocation reason/evidence;
- policy/version reference;
- idempotency/replay identity for mutations.

A ShareGrant cannot expand authority beyond source ACL/RLS/policy.

### D. Virtual View Resolution

Virtual View is a server-side authorization resolution over source data.

It must:

- resolve only currently valid ShareGrants;
- re-check source authority where required;
- return only granted fields/objects;
- never persist a third merged professional payload store merely for convenience;
- fail closed when grant, tenant, Room, source object or policy cannot be verified.

### E. Derived Access / Invalidation Evidence

Grant revoke/expiry must remove future retrieval authority from:

- Vector DB;
- Embeddings;
- Search Index;
- Cache;
- Prompt Context;
- AI Memory;
- Derived Copy/materialised derivative;
- active retrieval/session context where technically enforceable.

The persistence model must therefore support an attributable invalidation work/evidence identity without storing unnecessary payload copies.

Invalidation must be:

- idempotent;
- replay-safe;
- status/evidence producing;
- retryable without restoring access;
- able to prove stale-grant retrieval is denied after revoke/expiry.

### F. Minimum Billing Metadata

Billing/usage metadata must be physically/logically separated from vault payload bodies.

Permitted minimum metadata may include only what the locked Global Security & Billing contract requires, such as:

- tenant/customer billing reference;
- Room/catalog/product ID;
- provider/model ID;
- usage units;
- rate schedule version;
- management-fee schedule version;
- execution/evidence ID;
- timestamp;
- idempotency key.

Billing must not require Legal/Accounting document bodies, transcripts, evidence content, matter narratives or other professional payload.

## 6. Required RLS / server-authorization properties

Any future migration must have disposable evidence proving all applicable properties before Hosted staging:

1. RLS enabled on every tenant-owned Vault/ShareGrant table.
2. no anonymous direct payload access.
3. ordinary authenticated users cannot bypass Vault policy by direct table writes.
4. Legal-only context cannot read Accounting payload.
5. Accounting-only context cannot read Legal payload.
6. Room/tenant mismatch is denied.
7. ShareGrant cannot be self-issued beyond source authority.
8. revoked/expired ShareGrant returns no new retrieval access.
9. bridge coordination cannot create merged payload storage.
10. billing execution path cannot select vault payload bodies.
11. unknown/missing policy or authority returns DENY/REVIEW, never implicit allow.
12. privileged mutation path is narrowly scoped, auditable and not exposed as a generic client RPC.

## 7. Existing-data preservation requirements

Any later migration plan must explicitly prove preservation of:

- existing Room IDs;
- Room history;
- Room Memory;
- conversation history;
- customer files/data;
- existing Legal records;
- existing Room Factory manifests;
- existing Room membership and household membership;
- existing Matter records.

No migration may reinterpret existing Legal data as Accounting data or automatically copy existing Legal payload into a bridge/shared store.

## 8. Migration design constraints

When the canonical tenant/org boundary is proven, the implementation batch must remain narrow and additive.

Required constraints:

- forward migration plus explicit rollback/recovery plan;
- no migration-history repair by inference;
- no blind `--include-all`;
- exact linked `migration list --linked` and `db push --linked --dry-run` evidence first;
- clean disposable full-replay evidence;
- RLS/authenticated negative tests;
- cross-tenant and cross-vault negative tests;
- revocation/expiry stale-retrieval tests;
- failure-residue tests;
- billing no-payload-access test;
- Preview/test before any Hosted apply;
- Hosted read-back after controlled staging before runtime wiring.

## 9. Proposed implementation lanes after this map

These lanes are serialized where schema/authority overlaps.

### Lane 1 — Tenant/org authority proof

Evidence only. Resolve the canonical tenant/org boundary from repository architecture and current Room ownership model.

### Lane 2 — Vault/ShareGrant schema candidate

Only after Lane 1 PASS. One Single Writer. Migration + disposable evidence only; no UI/runtime exposure.

### Lane 3 — Auth/RLS security review

Independent review of tenant isolation, cross-vault denial, grant scope, revocation and privileged mutation paths.

### Lane 4 — Controlled test/staging

Only after exact linked migration evidence. Apply in controlled non-Production context, read back schema/policies, run authenticated negative/positive tests and rollback evidence.

### Lane 5 — Room Factory / Professional Room runtime binding

Only after persistence boundary is proven. Use the governed 18-room catalog and existing `legal`/`accounting` Room Factory primitives; do not fork security logic per Room.

### Lane 6 — Create Room UI exposure

Last among these lanes. Additive selector only after backend boundaries pass. Existing native composer/history/Room IDs remain locked.

## 10. Acceptance evidence before Hosted mutation

All must be evidenced; none may be inferred:

- [ ] canonical tenant/org boundary proven;
- [ ] exact writable schema files declared;
- [ ] schema/RLS threat model reviewed;
- [ ] Vault separation model reviewed;
- [ ] ShareGrant scope/revoke/expiry model reviewed;
- [ ] derived invalidation model reviewed;
- [ ] billing metadata allowlist reviewed;
- [ ] disposable migration replay PASS;
- [ ] authenticated cross-tenant negative tests PASS;
- [ ] Legal-to-Accounting and Accounting-to-Legal direct-read negative tests PASS;
- [ ] stale-grant retrieval after revoke/expiry denied;
- [ ] idempotent invalidation evidence PASS;
- [ ] billing no-vault-payload access PASS;
- [ ] exact linked migration apply set proven;
- [ ] independent security/Codex review has no unresolved P0;
- [ ] rollback/recovery procedure proven.

## 11. Current disposition

**IMPACT MAP COMPLETE / IMPLEMENTATION BLOCKED.**

The persistent Vault/ShareGrant migration must not be written yet because the canonical tenant/org identity is not proven from current evidence, the October linked migration apply set remains independently blocked, and the required HIGH-RISK implementation review gates are not yet satisfied.

This is intentional fail-closed behavior and does not block continued source-only Professional Room catalog/Room Factory integration evidence.
