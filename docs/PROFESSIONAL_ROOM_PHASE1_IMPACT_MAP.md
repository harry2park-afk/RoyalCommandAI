# Professional Room Phase 1 — Implementation Impact Map

Date: 2026-09-02 Australia/Sydney
Contract: Design Contract v2.3
Status: DESIGN ONLY — NO IMPLEMENTATION AUTHORITY YET

## 1. Purpose

Define writable resource boundaries before any Professional Room implementation. This document does not authorize touching a listed existing path merely because it appears here; it distinguishes protected existing surfaces from proposed additive surfaces.

## 2. Existing repository authorities

- `ROYAL_COMMAND_LAW.md` — highest governance authority.
- `AGENTS.md` — agent execution rules subordinate to the Law.
- `docs/ROOM_SOURCE_OF_TRUTH.md` — Room runtime/executor authority.
- `docs/COMMAND_ROOM_UI_LOCKS.md` — owner-approved UI locks.
- `/api/ai/chat/stream` — single Room AI routing authority.
- `/api/dev/agent` — shared GitHub developer executor for ChatGPT/Claude/Gemini/Grok.
- `/api/builder` — explicit Codex specialist analysis route only, no GitHub writer.

## 3. LOCKED / DO NOT MODIFY by default

### UI

- `src/app/rooms/[id]/ChatHistorySidebar.tsx`
- native composer/textarea layout and behavior in `src/app/rooms/[id]/RoomV3.tsx`
- unrelated landing/login/Dashboard/RCA/Room Factory/AI Helper UI

### Data continuity

- existing Room IDs
- existing Room history
- existing customer conversation history
- existing Room Memory
- unrelated tenant/customer data

### Execution authority

- no direct `master` writes
- no duplicate provider-specific GitHub writer
- no room-specific bypass around `/api/ai/chat/stream` or `/api/dev/agent`
- Codex remains specialist analysis unless a separately reviewed governance amendment changes that authority

## 4. Proposed additive implementation domains

Exact filenames are not yet treated as existing files. Any new path must be marked `NEW FILE` during implementation planning.

### A. Professional room catalog/config

Purpose:
- fixed Legal 10 / Accounting 8 catalog;
- canonical room type IDs/slugs;
- Specialty Pack registry;
- product mapping including `bridge_la`.

Preferred boundary: new config/domain modules, not hard-coded UI branches.

### B. Professional policy domain

Purpose:
- Capability descriptors;
- Risk classification;
- Default ON/OFF;
- Country Pack dependency;
- Human confirmation requirement;
- side-effect classification.

Must delegate final authorization to the Unified Authority / Policy Engine.

### C. Authority grants domain

Purpose:
- ApprovalGrant;
- DelegationGrant;
- scope/expiry/revocation;
- Separation of Duties inputs;
- evidence references.

Must be tenant-scoped and matter/client-scoped where applicable.

### D. Vault boundary domain

Purpose:
- Legal Vault identity;
- Accounting Vault identity;
- vault-scoped access checks;
- no implicit cross-vault reads.

### E. ShareGrant domain

Purpose:
- ShareGrant create/read/revoke/expiry;
- Virtual View resolution;
- cascading invalidation queue/state;
- idempotent evidence for derivative invalidation.

Derived systems covered:
- Vector DB;
- Embeddings;
- Search Index;
- Cache;
- Prompt Context;
- AI Memory;
- Derived Copy/materialised derivative;
- active retrieval/session context where technically possible.

### F. Country Compliance Runtime

Purpose:
- jurisdiction/country capability resolution;
- review registry;
- expiry/demotion;
- fail-closed status.

No country-specific fork of the 18 Room implementation.

### G. ConnectorContract registry

Purpose:
- provider verification;
- country availability;
- side-effect class;
- idempotency;
- auth/data scope;
- billing ownership;
- connection state.

Unverified provider contract must not expose Connected.

### H. Evidence Chain

Purpose:
- request/proposal/policy/approval/action/outcome linkage;
- Host evidence references;
- retry/failure/rollback linkage.

### I. Cost Governor / Usage Ledger

Purpose:
- model/provider/connector cost control;
- runaway/retry limits;
- minimum Billing Metadata only.

## 5. Database impact policy

Any schema/RLS/database implementation is HIGH-RISK and requires a separate schema impact map before migration.

Mandatory database rules:

- tenant/org key on every tenant-owned professional object;
- vault domain explicit on vault-owned data;
- matter/client scope explicit where required;
- RLS/default-deny server enforcement, not UI-only filtering;
- Legal and Accounting vault payloads not merged for `bridge_la`;
- ShareGrant source/target/scope/expiry/revocation auditable;
- grants cannot expand authority beyond source ACL + policy;
- evidence records immutable or append-only where technically appropriate;
- billing metadata physically/logically constrained from vault payload access.

No hosted database mutation occurs until migration + RLS tests are reviewed and Preview/test evidence is available.

## 6. UI impact policy

The Professional Room experience should be additive and reuse stable RC Room primitives.

Allowed only after implementation plan approval:
- additive Professional Room catalog/selector surfaces;
- additive capability/status panels;
- clear OFF / Candidate / Human Confirmation / LEGAL REVIEW REQUIRED states;
- Specialty Pack selection UI;
- policy/approval prompts that do not replace the native composer.

Forbidden without a separate explicit owner order:
- redesigning the existing left conversation controls;
- replacing/resizing native composer;
- removing existing working AI selection/routing;
- deleting or renaming existing Room IDs/history;
- unrelated visual cleanup/refactor.

## 7. Single Writer work lanes

Implementation must be split so each conflicting resource has one Writer.

Recommended sequence:

1. Catalog + capability policy types/config — one Writer.
2. Authority/Grant core — one Writer.
3. Vault/ShareGrant data model — one Writer.
4. Country Compliance/Review Registry — one Writer.
5. ConnectorContract/Evidence/Cost metadata — one Writer.
6. Professional Room UI integration — one Writer after core contracts stabilize.
7. Telephony marketplace — separate later regulated lane.

Parallel work is permitted only for non-overlapping boundaries. Shared schemas/core policy files are serialized.

## 8. Mandatory reviewers

For HIGH-RISK implementation:

- Controller/Integrator: scope/risk/locked-surface check;
- Architecture reviewer: contract/data-boundary consistency;
- Security/Red-Team reviewer: authorization, isolation, revocation, side effects;
- Codex specialist: code/security inspection when the authenticated route is available;
- QA/Regression: visible-control behavior + old RC non-regression;
- Compliance review: Country Pack / jurisdiction status for regulated capabilities.

Reviewers do not share write authority with the active Single Writer.

## 9. Rollback and branch policy

- implementation branches use safe `rc-work` / approved work branches;
- direct master write prohibited;
- each implementation batch records exact base SHA;
- Preview before Production;
- Production-affecting changes require known-good restore point;
- locked/core regression prefers rollback to known-good baseline over layered workaround.

## 10. Phase 1 impact-map gate

`PASS` only when:

- locked surfaces are explicit;
- proposed additive boundaries are explicit;
- database work is separately gated HIGH-RISK;
- Single Writer ownership is explicit;
- no authority bypass is proposed;
- no existing customer/history/memory deletion is proposed;
- no Production action is implied;
- live Codex review is scheduled as a mandatory implementation merge gate rather than falsely marked complete.
