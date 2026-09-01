# Professional Room Phase 0 Review Record

Date: 2026-09-02 Australia/Sydney
Program: Royal Command Legal + Accounting Professional Room
Contract: Design Contract v2.3
Risk: HIGH-RISK / REGULATED
Scope: READ-ONLY architecture/design review; no implementation runtime change

## 1. Review authority

Authoritative sources checked:

- `ROYAL_COMMAND_LAW.md`
- `AGENTS.md`
- `docs/COMMAND_ROOM_UI_LOCKS.md`
- `docs/ROOM_SOURCE_OF_TRUTH.md`
- `docs/COMMAND_ROOM_STABLE_BASELINE.md`
- `docs/PROFESSIONAL_ROOM_DESIGN_CONTRACT_V2_3.md`

Repository-grounded review was performed against the actual current repository rather than assumed file paths.

## 2. Review perspectives

### A. Architecture / Claude-style lens

Verdict: PASS WITH IMPLEMENTATION CONDITIONS.

Confirmed:
- 18 fixed base rooms can share governed primitives without 18 forks.
- `bridge_la` is a coordination Product ID, not a merged datastore.
- Legal Vault and Accounting Vault remain separate trust/data domains.
- Shared access is ShareGrant Virtual View only.
- Unified Authority / Policy Engine is the single authorization decision model.
- Country differences remain Country Pack / adapter concerns rather than country forks.

Implementation conditions:
- no room-specific bypass of the policy engine;
- schema must carry tenant/org, vault domain, matter scope and jurisdiction explicitly;
- cross-vault access must be grant-resolved, not implicit by product membership.

### B. Global operations / Gemini-style lens

Verdict: PASS WITH FAIL-CLOSED COUNTRY CONDITIONS.

Confirmed:
- Country Compliance Runtime and Jurisdictional Review Registry are separate from base room definitions;
- unverified country/provider state cannot be represented as Connected;
- high-risk functions remain OFF without verified Country Pack/review evidence;
- telephony marketplace starts with 1 provider / 1-2 verified countries;
- direct carrier billing and separate RC management fee preserve commercial separation.

Implementation conditions:
- locale/currency/phone/provider availability must be data-driven;
- no hard-coded country-specific professional permission inside Room UI;
- review expiry must automatically demote affected capability to OFF/REVIEW REQUIRED.

### C. Red-team / Grok-style lens

Verdict: PASS WITH P0 ABUSE CONTROLS.

Threats checked:
- stale ShareGrant derivatives continuing to answer after revoke;
- AI-generated approval being mistaken for human approval;
- delegation privilege expansion;
- room-specific external side-effect shortcuts;
- billing service over-reading vault contents;
- stale connector `Connected` state;
- retries duplicating payments/filings/messages;
- break-glass becoming a permanent bypass;
- prompt/memory cross-vault leakage.

Required mitigations are present in v2.3: cascading invalidation, formal ApprovalGrant/DelegationGrant, DEFAULT DENY side-effect gateway, minimum Billing Metadata, idempotency/evidence, controlled break-glass and vault separation.

### D. Code/security / Codex gate

Repository evidence confirms the explicit Codex specialist route exists at `/api/builder`, uses the OpenAI Responses API, requires authenticated developer access, and intentionally has no GitHub writer.

This review session does not possess the authenticated Royal Command browser/session required to POST to that protected route, therefore **no false claim of a live Codex model execution is made**.

Disposition for Phase 0 documentation-only lock: `CODEX_NOT_REQUIRED_FOR_DOC_ONLY_LOCK`.

Mandatory before the first HIGH-RISK implementation merge: run the explicit Codex specialist against the Phase 1 matrix + implementation diff, record its output/evidence, and resolve every P0 finding before merge.

## 3. P0 contradiction check

No P0 contradiction found between v2.3 and Royal Command Law in these areas:

- Single Write Authority;
- evidence before SUCCESS;
- tenant/data isolation;
- provider neutrality;
- Country Pack architecture;
- external law precedence;
- least privilege;
- rollback / Preview-before-Production;
- locked UI preservation;
- high-risk review path.

## 4. P0 additions required before implementation

These are implementation preconditions, not reasons to reopen v2.3 principles:

1. Complete 18-room Capability / Safety / Default ON-OFF Matrix.
2. Complete implementation Impact Map and writable-resource boundary.
3. Define canonical IDs/slugs for all 18 base rooms.
4. Define formal policy inputs/outputs for ApprovalGrant and DelegationGrant.
5. Define ShareGrant invalidation evidence semantics and idempotency key.
6. Define Billing Metadata allowlist.
7. Define Country Pack capability status schema and review-expiry behavior.
8. Define connector side-effect idempotency requirements.
9. Run live Codex specialist review before first HIGH-RISK implementation merge.
10. Run at least one additional independent reviewer on implementation diffs where practical.

## 5. Locked surfaces revalidated

Do not modify without explicit impact-map authorization:

- `src/app/rooms/[id]/ChatHistorySidebar.tsx`
- native composer/textarea behavior in `src/app/rooms/[id]/RoomV3.tsx`
- existing Room IDs/history/memory/customer conversations
- unrelated landing/login/Dashboard/RCA/Room Factory/AI Helper UI
- direct `master` state

## 6. Host evidence

Phase 0 initial commit: `a6ab389b29e632c9477a15d2358ae5b5fee7fec7`.

Host compare confirmed the initial Phase 0 change added exactly one documentation file and changed zero implementation files.

PR: #623.

Vercel Preview for the initial Phase 0 head reported READY/SUCCESS.

GitHub Quality Gate / Change Control / Conflict Guard runs for the automatically-created PR reported `action_required` with no executed jobs. This is **not counted as PASS**. Because Phase 0 is documentation-only, it does not authorize production or implementation regardless.

## 7. Review verdict

`PHASE0_DESIGN_REVIEW = PASS_WITH_IMPLEMENTATION_PRECONDITIONS`

No production implementation is authorized by this review alone. Phase 1 design elaboration is authorized: matrix + impact map + acceptance tests. The first HIGH-RISK implementation merge remains blocked until the mandatory live Codex and implementation review gates are satisfied.
