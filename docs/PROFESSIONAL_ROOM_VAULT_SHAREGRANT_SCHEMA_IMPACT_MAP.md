# Professional Room Vault / ShareGrant — Schema Impact Map

Date: 2026-09-10 Australia/Sydney  
Program: Royal Command Legal + Accounting Professional Rooms  
Governing design: Professional Room Design Contract v2.3  
Risk: HIGH-RISK / AUTHORIZATION / TENANT ISOLATION / CUSTOMER DATA  
Status: DESIGN / IMPACT MAP ONLY — NO DATABASE IMPLEMENTATION AUTHORITY

## 1. Purpose

Prepare the mandatory database impact map required before any persistent Legal Vault / Accounting Vault / ShareGrant implementation.

This document does not create a migration, does not approve a Hosted apply set, does not change RLS, does not alter Hosted Supabase, does not expose Professional Rooms in Create Room, and does not authorize Production deployment.

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

Original restore anchor:

`restore/2026-09-10-1347-master-vault-sharegrant-design`

Pre-tenant-authority-proof candidate restore:

`restore/2026-09-10-1448-pr756-pre-tenant-authority-proof`

No direct write to `master` is permitted from this work lane.

## 3. Existing Hosted schema evidence — READ ONLY

Fresh Hosted inspection on 2026-09-10 found the following current storage/access primitives.

### Core Room ownership

- `households`: `id`, `owner_id`, `household_type`, timestamps.
- `household_members`: `household_id`, `user_id`, `role`.
- `rooms`: `id`, `household_id`, `room_owner_id`, room state/timestamps.
- `room_members`: `room_id`, `user_id`, `role`, `language_pref`.
- all four currently have RLS enabled.

Fresh READ-ONLY integrity snapshot:

- rooms total: 3;
- rooms without `household_id`: 0;
- rooms without `room_owner_id`: 0;
- orphan `household_id` references: 0;
- Room owners that are neither household owner nor household member: 0;
- `private.is_household_member(uuid)` exists.

Current Hosted `rooms_insert` requires the authenticated Room owner to also be the target household owner or an existing household member. `rooms_select_member` is scoped by Room membership, Room ownership or household membership. This keeps the Room -> Household boundary database-authoritative for current Room access.

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

## 4. Tenant authority proof — RESOLVED FOR ROOM-SCOPED PROFESSIONAL DATA

The original impact map correctly blocked a Vault/ShareGrant migration because schema inspection alone did not prove that `household_id` was the intended tenant authority.

Repository history now supplies that missing authority.

### Merged authority

PR #365, **RCA V2: verify BUILD tenant Room boundary**, is merged into `master`.

Its stated goal is to reuse the existing RLS-enabled household/Room model as the RCA tenant boundary rather than creating a new tenant schema.

The merged/current file:

`src/lib/rcaV2/tenantContext.ts`

performs an authenticated RLS-scoped read of:

`rooms.id, rooms.household_id`

and only after that read succeeds returns:

- `roomId = rooms.id`
- `tenantId = rooms.household_id`

The current `src/app/api/au-v2/rule-gate/route.ts` consumes that result and sets `tenantIsolationVerified = tenant.verified`; BUILD remains blocked when the Room/Tenant boundary cannot be verified.

This is not a historical proposal only: both files are present on the protected current `master` baseline.

### Database corroboration

Fresh Hosted READ-ONLY evidence also confirms that the live Room model is internally consistent and RLS-backed:

- all four ownership/membership tables have RLS enabled;
- all current Rooms have a household and owner;
- no orphan household references were observed;
- every current Room owner is the household owner or a household member;
- current Room INSERT policy rejects attaching a Room to an unrelated household.

### Professional Room persistence mapping

For **Room-scoped Professional Room persistence**, the approved design mapping is therefore:

`tenant_id := rooms.household_id`

with these mandatory invariants:

1. persisted `tenant_id` references the same `households.id` that owns/scopes the authoritative Room;
2. `room_id` is mandatory for Room-owned professional objects and must resolve to that same `tenant_id`;
3. a client must never be able to provide an arbitrary `tenant_id` that is trusted independently of the authoritative Room relationship;
4. server-side mutation must derive or verify the tenant from the authoritative Room before write;
5. cross-household Room/object/grant combinations fail closed;
6. future organization/account abstractions may wrap or reference this boundary, but may not silently reinterpret existing Room data under a different tenant identity.

### Scope limitation

This proof is intentionally narrow.

It proves the canonical tenant identity for **current RCA/Room-scoped Professional Room data**. It does **not** claim that `household_id` is a universal identifier for every future Royal Command company, billing account, legal entity or organization concept.

If a future Global Core organization registry is introduced, it must provide an explicit reviewed mapping to the existing Room/Household boundary and may not silently remap existing tenant-owned Professional Room rows.

**Lane 1 disposition: PASS for current Room-scoped Professional Room persistence.**

This removes the former P0 ambiguity, but it does not authorize a database migration by itself.

## 5. Required logical data domains

The following are logical responsibilities required by v2.3. Names below are domain labels, not approved SQL table names.

### A. Vault Identity

Must identify:

- owning tenant boundary using the verified Room -> Household mapping;
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

## 6. Threat model that the schema candidate must prove

Before any Hosted write, the disposable implementation evidence must explicitly cover these threats.

### Cross-tenant reference substitution

An authenticated actor attempts to combine a Room from one household with a Vault/Object/ShareGrant tenant identifier from another household.

Required behavior: DENY and no partial rows.

### Cross-vault direct access

A Legal-only context attempts direct Accounting payload access, or an Accounting-only context attempts direct Legal payload access without a valid ShareGrant Virtual View.

Required behavior: DENY.

### Grant self-escalation

A client attempts to mint a ShareGrant broader than its source authority, widen field/object/action scope, extend expiry, or change the source tenant/Room.

Required behavior: DENY; privileged mutation path only.

### Revoked/expired stale retrieval

A previously valid grant is revoked or expires while derived retrieval state exists in vector/search/cache/prompt/memory/derived-copy/session surfaces.

Required behavior: new retrieval fails closed; invalidation remains idempotent/retryable and produces evidence.

### Replay/duplicate grant mutation

A network/client retry repeats grant/revoke/invalidation requests.

Required behavior: idempotent outcome; no widening or reactivation caused by replay.

### Bridge storage collapse

`bridge_la` coordination attempts to persist a third merged Legal+Accounting payload store.

Required behavior: structurally impossible or explicitly rejected. `bridge_la` remains one Product ID plus ShareGrant-authorized Virtual View.

### Billing exfiltration

Billing/usage code attempts to select protected Legal/Accounting payload body fields.

Required behavior: database/API contract exposes only allow-listed billing metadata.

### Missing authority / policy drift

Required tenant, Room, source object, ShareGrant, policy version or jurisdiction authority is missing/unknown.

Required behavior: DENY/REVIEW, never implicit allow.

## 7. Required RLS / server-authorization properties

Any future migration must have disposable evidence proving all applicable properties before Hosted staging:

1. RLS enabled on every tenant-owned Vault/ShareGrant table.
2. no anonymous direct payload access.
3. ordinary authenticated users cannot bypass Vault policy by direct table writes.
4. Legal-only context cannot read Accounting payload.
5. Accounting-only context cannot read Legal payload.
6. Room/tenant mismatch is denied.
7. `tenant_id` is derived/verified from the authoritative Room -> Household relationship.
8. ShareGrant cannot be self-issued beyond source authority.
9. revoked/expired ShareGrant returns no new retrieval access.
10. bridge coordination cannot create merged payload storage.
11. billing execution path cannot select vault payload bodies.
12. unknown/missing policy or authority returns DENY/REVIEW, never implicit allow.
13. privileged mutation path is narrowly scoped, auditable and not exposed as a generic client RPC.

## 8. Existing-data preservation requirements

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

No migration may silently replace the verified Room -> Household tenant mapping for existing Room-scoped data.

## 9. Migration design constraints

With the Room-scoped tenant boundary now proven, the next implementation batch may be designed, but must remain narrow and additive.

Required constraints:

- forward migration plus explicit rollback/recovery plan;
- no migration-history repair by inference;
- no blind `--include-all`;
- exact linked `migration list --linked` and `db push --linked --dry-run` evidence before any Hosted apply;
- clean disposable full-replay evidence;
- RLS/authenticated negative tests;
- cross-tenant and cross-vault negative tests;
- revocation/expiry stale-retrieval tests;
- failure-residue tests;
- billing no-payload-access test;
- Preview/test before any Hosted apply;
- Hosted read-back after controlled staging before runtime wiring.

The schema candidate itself may be authored before Hosted linked apply evidence exists only as an isolated Draft with disposable tests. It must not be applied, merged for deployment, or used to expose runtime until the linked migration gate is proven.

## 10. Proposed implementation lanes after this map

These lanes are serialized where schema/authority overlaps.

### Lane 1 — Tenant authority proof

**PASS for current Room-scoped Professional Room persistence.**

Authority: merged PR #365 + current `tenantContext.ts` + current rule-gate use + fresh Hosted RLS/integrity evidence.

### Lane 2 — Vault/ShareGrant schema candidate

Next eligible lane. One Single Writer. Migration + disposable evidence only; no UI/runtime exposure and no Hosted apply.

Required schema design properties before code review:

- tenant FK anchored to `households.id` for Room-scoped Professional data;
- Room FK mandatory where object is Room-owned;
- server verification that Room household equals tenant;
- separate Legal/Accounting vault identities;
- ShareGrant references source vault/object instead of copying payload;
- explicit active/expiry/revocation state;
- replay/idempotency identity for grant/invalidation mutation;
- server-owned invalidation evidence;
- billing metadata surface contains no professional payload body.

### Lane 3 — Auth/RLS security review

Independent review of tenant isolation, cross-vault denial, grant scope, revocation and privileged mutation paths.

### Lane 4 — Controlled test/staging

Only after exact linked migration evidence. Apply in controlled non-Production context, read back schema/policies, run authenticated negative/positive tests and rollback evidence.

### Lane 5 — Room Factory / Professional Room runtime binding

Only after persistence boundary is proven. Use the governed 18-room catalog and existing `legal`/`accounting` Room Factory primitives; do not fork security logic per Room.

### Lane 6 — Create Room UI exposure

Last among these lanes. Additive selector only after backend boundaries pass. Existing native composer/history/Room IDs remain locked.

## 11. Acceptance evidence before Hosted mutation

All must be evidenced; none may be inferred:

- [x] canonical tenant boundary proven for current Room-scoped Professional Room persistence;
- [ ] exact writable schema files declared;
- [x] initial schema/RLS threat model documented;
- [ ] Vault separation implementation reviewed;
- [ ] ShareGrant scope/revoke/expiry implementation reviewed;
- [ ] derived invalidation implementation reviewed;
- [ ] billing metadata allowlist implementation reviewed;
- [ ] disposable migration replay PASS;
- [ ] authenticated cross-tenant negative tests PASS;
- [ ] Legal-to-Accounting and Accounting-to-Legal direct-read negative tests PASS;
- [ ] stale-grant retrieval after revoke/expiry denied;
- [ ] idempotent invalidation evidence PASS;
- [ ] billing no-vault-payload access PASS;
- [ ] exact linked migration apply set proven;
- [ ] independent security/Codex review has no unresolved P0;
- [ ] rollback/recovery procedure proven.

## 12. Current disposition

**IMPACT MAP COMPLETE / TENANT AUTHORITY P0 RESOLVED / SCHEMA IMPLEMENTATION NOT YET VERIFIED.**

The former tenant identity ambiguity is resolved for current Room-scoped Professional Room persistence using merged repository authority and fresh Hosted evidence. Lane 2 may now prepare an isolated Draft schema candidate with disposable tests.

Hosted application remains blocked because the October linked migration apply set is independently unresolved and HIGH-RISK schema/RLS implementation evidence does not yet exist.

This is intentional fail-closed behavior and does not block continued source-only Professional Room catalog/Room Factory integration evidence.