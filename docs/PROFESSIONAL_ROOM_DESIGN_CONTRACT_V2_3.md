# Royal Command Legal + Accounting Professional Room — Design Contract v2.3

Status: PHASE 0 LOCK CANDIDATE
Date: 2026-09-02 (Australia/Sydney)
Risk class: HIGH-RISK / REGULATED
Writer: ChatGPT (single writer for this Phase 0 document)
Implementation status: NOT STARTED
Production status: NO CHANGE

## 1. Authority and non-regression

This contract is subordinate to `ROYAL_COMMAND_LAW.md`, but is the implementation contract for the Legal + Accounting Professional Room program.

Existing approved Royal Command structure, working UI, Room history, Room IDs, memory, customer data and locked surfaces must not be removed, replaced, silently resized, refactored or reimplemented merely to deliver this program.

Existing locked Command Room surfaces remain locked, including the protected left conversation controls and native Room composer unless the Owner explicitly orders a change to those exact surfaces.

No direct write to `master`. Preview/Test precedes Production. No SUCCESS without Host-verifiable evidence.

## 2. Fixed product scope

The product contains exactly:

- Legal Professional Room: 10 base rooms.
- Accounting Professional Room: 8 base rooms.
- Total: 18 base rooms.
- Specialty Pack architecture remains supported for optional jurisdiction/practice extensions without changing the fixed base-room count.

The 18 rooms must be produced from shared governed room primitives where practical; they must not become 18 uncontrolled forks.

## 3. Room capability contract

Every base room must declare, before implementation:

1. Room ID / canonical slug.
2. Professional domain: Legal or Accounting.
3. Capability set.
4. Safety Policy set.
5. Default ON/OFF state for every material capability.
6. Jurisdiction / Country Pack dependency.
7. Human approval requirement.
8. External side-effect permission class.
9. Vault read/write boundary.
10. Connector dependencies.
11. Evidence requirements.
12. Cost/usage policy.

No capability may exist only as an undocumented prompt behavior.

## 4. AI Secretary / Digital Worker

AI Secretary is classified as a Digital Worker, not an autonomous professional decision-maker.

It may draft, classify, summarise, organise, retrieve and propose actions within policy.

For high-risk professional judgments or regulated conclusions, AI output is always:

`Candidate -> Human Confirmation -> Approved/Rejected/Modified`

No Candidate is treated as final professional advice, filing authority, payment authority, client instruction, legal position, tax position or regulated decision unless the applicable human approval gate is satisfied.

## 5. External Side-Effect Gateway

All actions that can create an external side effect are DEFAULT DENY.

Examples include sending communications, filing, submitting, signing, paying, transferring funds, changing official records, making bookings, changing permissions, creating binding instructions, publishing, porting numbers or triggering a carrier/provider operation.

The gateway may release an action only when all applicable conditions are satisfied:

- authenticated actor;
- Unified Authority / Policy Engine ALLOW result;
- required ApprovalGrant;
- required DelegationGrant;
- scope and expiry valid;
- Country Pack permits the function;
- required Legal/Regulatory Review status is satisfied;
- connector is verified and currently permitted;
- evidence/audit event can be written;
- Separation of Duties constraints are satisfied.

Unknown or incomplete authority is DENY, not implicit allow.

## 6. Data isolation and `bridge_la`

Legal Vault and Accounting Vault are physically/logically separated protected domains and must not be treated as one combined professional datastore.

For a customer operating both Legal + Accounting practices, the internal Product ID is:

`bridge_la`

`bridge_la` is a product/coordination identity only. It does not merge vault ownership.

Shared data is not stored in a third Shared Vault. Shared access is a ShareGrant-based Virtual View over specifically authorised source material.

Billing Engine must not read entire Legal or Accounting Vault contents. It may access only minimum Billing Metadata required for metering, invoicing, entitlement and audit.

## 7. ShareGrant and cascading invalidation

ShareGrant must be explicit, scoped, attributable, time-bound where appropriate, revocable and auditable.

On revoke, expiry or invalidation, access must be removed from every derived access path, including:

- Vector DB;
- Embeddings;
- Search Index;
- Cache;
- Prompt Context;
- AI Memory;
- Derived Copy / materialised derivative;
- active retrieval/session context where technically possible.

Invalidation must be idempotent and evidence-producing. A stale derived copy must not silently remain queryable after the source grant is invalid.

## 8. Unified Authority / Policy Engine

A single policy decision model governs professional-room authority. It combines:

- RBAC;
- ABAC;
- Matter ACL;
- Separation of Duties;
- ApprovalGrant;
- DelegationGrant;
- tenant/customer restrictions;
- Country Compliance Runtime;
- provider/connector restrictions;
- resource/dependency conflict rules.

Required decision outcomes align with Royal Command Law:

- ALLOW
- ALLOW_WITH_CONDITIONS
- OWNER_APPROVAL_REQUIRED
- BLOCK
- UNKNOWN_REQUIRES_REVIEW

Regulated execution may not bypass the engine through a room-specific shortcut.

## 9. ApprovalGrant

ApprovalGrant must include at minimum:

- approver identity;
- tenant/org;
- matter/room or action scope;
- permitted action;
- constraints/amount/destination where relevant;
- created time;
- expiry or one-time-use rule where relevant;
- evidence reference;
- revocation state.

Approval cannot be inferred from AI output or ordinary chat wording when a formal approval is required.

## 10. DelegationGrant

DelegationGrant is distinct from ApprovalGrant.

It defines who may act for whom, for what scope, during what period, with what limits, and whether sub-delegation is prohibited or permitted.

Delegation does not expand the delegator's own authority and cannot override Country Compliance or Separation of Duties.

## 11. Authentication, recovery and break-glass

High-risk professional access must support Passkey/WebAuthn as the preferred strong authentication control.

Recovery must not create an easier bypass than normal authentication.

Break-glass access must be narrowly scoped, strongly authenticated, time-limited, fully audited and automatically reviewed after use. Break-glass may not silently disable tenant isolation, vault separation or evidence requirements.

## 12. Country Compliance Runtime

Country-specific legal, accounting, privacy, data residency, telecommunications and professional-service constraints live in Country Packs / approved adapters, not uncontrolled country forks.

Any High-Risk capability that depends on country-specific compliance is DEFAULT OFF if the required Country Pack is missing, unverified, expired or marked `LEGAL REVIEW REQUIRED`.

No UI may represent such a capability as available/connected when the compliance prerequisite is not satisfied.

## 13. Jurisdictional Review Registry

Each regulated capability must be able to resolve a jurisdictional review status such as:

- VERIFIED_ACTIVE
- VERIFIED_WITH_CONDITIONS
- LEGAL_REVIEW_REQUIRED
- EXPIRED_REVIEW
- BLOCKED
- NOT_SUPPORTED

Review records require jurisdiction, capability, reviewer/source provenance, effective date, review/expiry date where relevant and evidence reference.

## 14. Canonical ConnectorContract

Professional Rooms access external systems only through the Canonical ConnectorContract or approved adapter implementing the same controls.

A connector must expose at minimum:

- provider identity;
- capability identity;
- country/jurisdiction availability;
- auth method;
- read/write/side-effect classification;
- data scope;
- timeout/retry policy;
- idempotency behavior where required;
- audit/evidence fields;
- health/connection state;
- billing ownership/model;
- revocation/disconnect behavior.

Provider contract not completed/verified -> UI must not show `Connected`.

## 15. Evidence Chain

Every material high-risk action requires an evidence chain sufficient to answer:

- who requested it;
- who/what proposed it;
- policy decision;
- human approval/delegation used;
- connector/provider used;
- exact action scope;
- before/after or outcome evidence;
- timestamp;
- failure/retry state;
- rollback/remediation reference where relevant.

AI self-report alone is never execution evidence.

## 16. Cost Governor / Usage Ledger

Every room and connector path must be meterable.

The Cost Governor controls model/provider spend, retries, runaway tasks, connector cost and tenant/customer limits.

Usage Ledger records billable/chargeable usage without requiring broad vault-content access.

Cost controls must fail safely and must not cause duplicate external side effects through retries.

## 17. Customer Exit / Portability

Customers must have a defined exit path for their permitted data, records, configuration and evidence exports subject to law, retention duties and third-party restrictions.

Exit design must distinguish customer-owned data from Royal Command proprietary orchestration/IP and provider-owned/regulated records.

Access termination must trigger relevant credential, ShareGrant, DelegationGrant, session, memory/cache and connector revocations.

## 18. Telephony contract

Where supported:

- Customer-Owned Number is preferred for customer portability.
- Carrier-Provided Telephony remains the underlying regulated carrier service.
- Royal Command may provide RC Managed Service as the management/orchestration layer.
- Direct Carrier Billing is the default commercial model where feasible.
- Royal Command Management Fee is separately represented.
- Migration path is Forwarding -> Porting when supported and approved.

Phone Marketplace MVP is limited to:

- 1 provider;
- 1 to 2 verified countries;
- only verified inventory/connection states.

Provider agreement not verified -> no `Connected` representation.

Regulated telecommunications actions remain OFF until applicable review is satisfied.

## 19. Locked Surface declaration for implementation

Until an explicit approved impact map says otherwise, implementation must treat these as LOCKED / DO NOT MODIFY for the Professional Room build:

- existing approved landing/login paths unrelated to the 18-room program;
- existing Command Room left conversation/history controls;
- existing native Command Room composer/textarea behavior and layout;
- existing working Room history and Room IDs;
- existing customer conversation history and Room Memory;
- existing provider routing/executor authority unless an approved Phase implementation specifically requires an adapter extension;
- direct `master` behavior;
- unrelated Dashboard/RCA/Room Factory/AI Helper UI.

New Professional Room UI should be additive and use existing stable primitives wherever possible.

## 20. Capability / Safety / Default State matrix rule

Phase 1 implementation may not begin until a complete matrix exists for all Legal 10 and Accounting 8 rooms.

Each row must contain:

`Room | Capability | Risk | Vault | Country Pack | Human Confirmation | External Side Effect | Default State | Required Grant | Evidence`

Default-state rule:

- low-risk internal drafting/retrieval may be ON if tenant/vault access is valid;
- professional high-risk judgment is Candidate-only until Human Confirmation;
- external side effect is OFF/DEFAULT DENY until all gateway conditions pass;
- missing Country Pack or required legal/accounting/telecom review -> OFF;
- unverified connector/provider contract -> OFF and not Connected.

## 21. Phase 0 Acceptance Gate

Phase 0 is PASS only if all items below are true.

### A. Scope
- [x] Legal base room count fixed at 10.
- [x] Accounting base room count fixed at 8.
- [x] Specialty Pack preserved.
- [x] 18-room implementation not yet started.

### B. Safety architecture
- [x] Candidate -> Human Confirmation fixed for high-risk professional judgment.
- [x] External Side-Effect DEFAULT DENY fixed.
- [x] Unified Authority / Policy Engine fixed.
- [x] RBAC + ABAC + Matter ACL + Separation of Duties fixed.
- [x] ApprovalGrant and DelegationGrant separated.
- [x] Passkey/WebAuthn + controlled Recovery/Break-glass fixed.

### C. Data architecture
- [x] Legal Vault / Accounting Vault separation fixed.
- [x] `bridge_la` single internal Product ID fixed for Legal + Accounting practice coordination.
- [x] Shared = ShareGrant Virtual View, not third datastore.
- [x] Billing Engine limited to minimum Billing Metadata.
- [x] cascading ShareGrant invalidation includes Vector DB, Embedding, Search, Cache, Prompt Context, AI Memory and Derived Copy.

### D. Compliance / connectors
- [x] Country Compliance Runtime fixed.
- [x] Jurisdictional Review Registry fixed.
- [x] Canonical ConnectorContract fixed.
- [x] provider contract verification required before Connected state.
- [x] Country Pack missing/unverified -> regulated/high-risk capability OFF.

### E. Evidence / cost / exit
- [x] Evidence Chain fixed.
- [x] Evidence-free SUCCESS prohibited.
- [x] Cost Governor / Usage Ledger fixed.
- [x] Customer Exit / Portability fixed.

### F. Telephony
- [x] Customer-Owned Number where supported.
- [x] Carrier-Provided Telephony.
- [x] RC Managed Service.
- [x] Direct Carrier Billing default + separate RC Management Fee.
- [x] Forwarding -> Porting migration path.
- [x] Phone Marketplace MVP limited to 1 provider / 1-2 verified countries.

### G. Change safety
- [x] Existing approved UI/structure protected.
- [x] Single Writer required per conflicting boundary.
- [x] impact map required before code modification.
- [x] Preview/Test before Production.
- [x] direct master writes prohibited.
- [x] Host-verifiable evidence required for implementation SUCCESS.

## 22. Exit condition from Phase 0

Phase 0 may be declared `LOCKED` only after:

1. this document exists on an isolated `rc-work` branch;
2. repository evidence confirms no implementation file was changed by this Phase 0 commit;
3. an independent review finds no P0 contradiction against v2.3 or Royal Command Law;
4. the diff is documentation-only;
5. the Owner's current instruction covers locking Phase 0.

After Phase 0 LOCK, the next allowed activity is Phase 1 design elaboration: the complete 18-room Capability / Safety Policy / Default ON-OFF Matrix and implementation impact map. No production implementation begins before that gate is complete.
