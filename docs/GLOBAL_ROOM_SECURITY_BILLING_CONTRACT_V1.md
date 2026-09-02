# Global Room Security & Billing Contract v1.0

Date: 2026-09-02 Australia/Sydney
Risk: HIGH-RISK / GLOBAL CORE / SECURITY / BILLING
Status: DESIGN GATE — all current and future Rooms must conform before Production activation
Authority: subordinate to `ROYAL_COMMAND_LAW.md`; stricter controls here apply only to the risks declared below.

## 1. Purpose

Royal Command may operate 100+ Room types. Security and billing MUST NOT be reimplemented independently per Room. Royal Command uses one Global Security & Billing Core and versioned Room Policies.

A new Room inherits the Core and supplies only approved policy/configuration. Missing mandatory policy is fail-closed.

## 2. One Global Core

Every Room, including Legal, Accounting and future domains, passes through the same canonical execution chain:

`AUTH -> TENANT/ORG -> ROOM MEMBERSHIP -> ROOM POLICY -> DATA/Vault POLICY -> BILLING/ENTITLEMENT -> COUNTRY/COMPLIANCE -> CAPABILITY/TOOL GATE -> AI/PROVIDER GATE -> SIDE-EFFECT GATE -> EXECUTION -> EVIDENCE/AUDIT`

No Room may bypass a mandatory gate by calling an AI/provider/tool directly.

## 3. Universal Room Policy Contract

Each Room type MUST resolve to a versioned policy containing at least:

- `room_type_id`
- `product_id`
- `policy_version`
- `risk_class`
- `data_domain`
- `vault_policy_id`
- `capability_policy_id`
- `ai_provider_policy_id`
- `tool_connector_policy_id`
- `billing_policy_id`
- `country_policy_id`
- `retention_exit_policy_id`
- `human_approval_policy_id`
- `side_effect_policy_id`
- `owner_approval_evidence`
- `active_from` / `active_to`

If any mandatory policy reference is absent, expired, blocked or unapproved, paid/regulated execution is denied.

## 4. Identity, Authentication and Tenant Isolation

Production access MUST enforce the hierarchy:

`User -> Organisation/Tenant -> Room -> Conversation/Task/Resource`

Requirements:

- server-side authentication and authorization;
- least privilege;
- tenant-scoped queries and writes;
- Room membership and role checks;
- no cross-tenant memory, billing, secrets, files, embeddings or execution state;
- Passkey/WebAuthn preferred for privileged operators;
- break-glass access narrowly scoped, time-bound and audited;
- UI state is never authorization evidence.

## 5. Data and Vault Rules

Billing/security metadata is separate from customer content.

For Legal + Accounting:

- Legal Vault and Accounting Vault remain separate;
- `bridge_la` is one Product ID but MUST NOT merge the Vaults;
- Shared data is a ShareGrant-authorized Virtual View, not a physical Shared Vault;
- Billing Engine receives minimum billing metadata only and MUST NOT read Vault payload bodies.

Future Room domains must declare their own data domain and storage boundary; cross-domain access requires an explicit policy/grant.

## 6. ShareGrant Revocation

Grant revoke/expiry MUST invalidate authorized derived access as far as technically enforceable, including:

- vector retrieval;
- embeddings authorization references;
- search indexes;
- cache;
- prompt context;
- AI memory;
- derived/materialized copies;
- active retrieval/session context.

New retrieval after revocation is fail-closed.

## 7. Global Billing Model

The canonical revenue formula is:

`ROOM_BASE + AI_USAGE + RC_MANAGEMENT_FEE + ADD_ONS`

Each Room may have a different owner-approved base charge. AI/provider/model usage may be billed under a versioned rate schedule. RC management fees remain a separate billable line. Specialty Packs/connectors may add separate charges.

Prices MUST NOT be hard-coded as a universal Professional Room price.

## 8. Published Price vs Custom Quote

- `PUBLISHED_CATALOG_PRICE`: versioned Owner-approved price that the system may display and charge automatically.
- `CUSTOM_QUOTE`: customer-specific negotiated commercial terms; Owner-only release. AI may not invent, estimate, negotiate, alter or release the monetary terms.

## 9. Payment-before-use

For paid Production Rooms:

`OWNER_APPROVED_PRICE -> LIVE CHECKOUT -> SERVER_VERIFIED_PAYMENT_CLEARED -> ENTITLEMENT_ACTIVE -> BILLABLE_USE`

Browser success pages, pending orders, client callbacks and unverified events are not payment evidence.

## 10. Test / Live Isolation — P0

Stripe or any payment provider test/sandbox activity MUST NEVER activate Production entitlement.

Production activation requires all of:

- provider event is from the configured Production endpoint/account;
- canonical provider environment is LIVE;
- server-side webhook signature verifies;
- expected tenant/customer/Room reference matches;
- expected amount/currency/price version matches where applicable;
- event is not replayed/duplicated;
- payment state is canonically CLEARED/PAID;
- no independent risk block is active.

A `livemode=false`, sandbox/test account, test Price/Product, test webhook secret or test API key is always rejected by the Production Entitlement Gate.

Test and Production secrets, webhook endpoints, customer IDs, product/price IDs and ledgers MUST be namespace-separated.

## 11. Payment Provider Security

Provider-neutral adapter is mandatory. Stripe may be the first provider but must not become an unreplaceable Global Core dependency.

Controls:

- secrets server-side only;
- restricted keys / least privilege where supported;
- separate Test and Production credentials;
- no PAN/CVV storage in Royal Command;
- hosted/tokenized checkout preferred;
- signed webhook verification using raw request body as required by provider;
- idempotency keys;
- duplicate-event detection;
- periodic reconciliation for missed/out-of-order webhooks;
- refunds, disputes and chargebacks represented in canonical state;
- key rotation and secret scanning;
- Production credential changes are HIGH-RISK.

## 12. Entitlement State Machine

Canonical minimum states:

- `PENDING_PAYMENT`
- `ACTIVE`
- `PAYMENT_WARNING`
- `SUSPENDED_NONPAYMENT`
- `SUSPENDED_RISK`
- `CANCELLED`

Initial paid access requires verified payment clearance.

At a configured hard payment due time, if payment is not cleared:

1. enter `PAYMENT_WARNING` immediately;
2. warn the customer and set `suspend_at = due_at + 60 seconds`;
3. immediately before suspension, re-read/reconcile authoritative server-side payment state;
4. if still not cleared at `suspend_at`, atomically set `SUSPENDED_NONPAYMENT`.

Verified payment clearance automatically restores `SUSPENDED_NONPAYMENT -> ACTIVE`.

Payment does NOT automatically clear `SUSPENDED_RISK`.

## 13. Suspension Boundary

Nonpayment suspension blocks:

- paid AI execution;
- paid connectors/tools;
- external side effects;
- new billable jobs;
- billable background automations.

It does NOT delete or destroy customer data and should continue to allow, as applicable:

- authentication needed to pay;
- billing/payment screens;
- invoice/status viewing;
- security/recovery;
- legally required data access/export/exit.

## 14. AI / Provider Security

All AI execution is provider-neutral and governed by Room policy.

Every execution decision MUST be based on server-side policy, not a button state.

A Room policy specifies:

- allowed providers/models;
- allowed data classifications;
- allowed tools/connectors;
- capability default `ON / CANDIDATE / OFF`;
- risk level;
- human confirmation requirements;
- jurisdiction/country restrictions;
- spend/cost limits;
- external side-effect permissions.

Missing provider/capability authorization is OFF.

## 15. Capability and Human Approval

HIGH-RISK/REGULATED judgment or action is Candidate-only until applicable Human Confirmation.

External side effects are DEFAULT DENY unless an explicit valid policy/grant authorizes the specific action and scope.

ApprovalGrant/DelegationGrant must be scoped, expiry-aware and auditable.

## 16. Country Compliance

Country/region differences belong in Country Profiles/approved adapters, not copied Room code.

Country Compliance Runtime must resolve at least:

- applicable operating country/jurisdiction;
- product/capability availability;
- privacy/data residency requirements;
- provider restrictions;
- payment/tax requirements;
- regulated review state.

Canonical review states:

- `VERIFIED_ACTIVE`
- `VERIFIED_WITH_CONDITIONS`
- `LEGAL_REVIEW_REQUIRED`
- `EXPIRED_REVIEW`
- `BLOCKED`
- `NOT_SUPPORTED`

Regulated capability is OFF if the required Country Pack/review is not valid.

## 17. Cost and Usage Governance

Each billable AI execution records minimum immutable billing evidence:

- tenant/customer billing reference;
- Room type/catalog/product ID;
- provider/model ID;
- usage units;
- rate schedule version;
- RC management-fee schedule version;
- execution/evidence ID;
- timestamp;
- idempotency key.

Cost Governor must support customer limits/alerts and provider spend controls. Billing Engine must not require customer Vault content.

## 18. Audit and Evidence

Material security, billing, entitlement, policy and side-effect transitions require Host-verifiable evidence.

At minimum record:

- actor/authority;
- tenant/Room;
- policy version;
- decision;
- reason codes;
- provider/event/evidence references where relevant;
- before/after state;
- timestamp;
- idempotency/replay result.

AI self-report is not execution evidence.

## 19. Universal Fail-Closed Rules

A Room MUST NOT become Production-usable if any mandatory item is missing or invalid, including:

- identity/auth authority;
- tenant/Room membership policy;
- mandatory Room policy;
- billing entitlement for paid capability;
- valid Country/Compliance status for regulated capability;
- required Capability/Tool policy;
- required owner-approved published price;
- required Human Confirmation;
- valid Production payment environment evidence.

## 20. Room Factory / Creation Gate

Any future Room Factory must validate the Universal Room Policy Contract before a Room type is marked Production-ready.

Creation pipeline:

`ROOM SPEC -> POLICY REFERENCES -> SECURITY VALIDATION -> BILLING VALIDATION -> COUNTRY VALIDATION -> CAPABILITY MATRIX -> TESTS -> REVIEW -> PREVIEW -> OWNER/RELEASE GATE`

A new Room inherits security behavior; it does not clone security code.

## 21. Required Tests for Every Room Type

At minimum automated policy tests must prove:

- wrong tenant denied;
- missing membership denied;
- missing/expired policy denied;
- test payment cannot activate Production;
- unpaid paid capability denied;
- payment warning/suspension state works;
- verified repayment can restore ordinary nonpayment suspension;
- risk suspension survives payment;
- prohibited provider/tool denied;
- external side effect denied by default;
- invalid country/review state denies regulated capability;
- billing calculation does not read protected Vault payload;
- evidence is generated for material transitions.

Domain-specific tests are added on top of this baseline.

## 22. Change and Review Path

Changes to shared security, auth, tenant isolation, billing, payments, entitlement, Country Compliance, Vault boundaries, provider execution authority or Production infrastructure are HIGH-RISK.

Required path under Royal Command Law:

- one Single Writer per conflicting resource boundary;
- repository-grounded review;
- at least two independent review perspectives when practical;
- Codex code/security inspection when an actual Codex connector is available;
- if unavailable, record `CODEX_UNAVAILABLE` and do not fabricate review evidence;
- exact-head lint/typecheck/unit/build as applicable;
- security/tenant/payment tests;
- known rollback point;
- Preview/sandbox evidence before Production.

## 23. Current Rollout Order

1. Lock this Global Contract.
2. Map Legal 10 + Accounting 8 to the Universal Room Policy Contract.
3. Implement central server-side Security/Entitlement Gate.
4. Implement persistent billing ledger/entitlement with RLS and tenant isolation.
5. Implement Stripe signed-webhook + LIVE/TEST hard separation.
6. Implement Country Compliance integration.
7. Apply the same template to future 100+ Rooms.
8. Production activation only after required independent review and evidence.

## 24. Non-Goals of This Contract

This document does not set actual customer prices, tax registrations, country legal conclusions, provider credentials, or Production secrets. Those require their own approved records and applicable external review.
