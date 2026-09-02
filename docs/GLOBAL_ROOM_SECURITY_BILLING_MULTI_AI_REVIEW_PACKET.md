# Global Room Security & Billing — Multi-AI Review Packet

Status: REVIEW PACKET READY
Target: `docs/GLOBAL_ROOM_SECURITY_BILLING_CONTRACT_V1.md`
Risk: HIGH-RISK / GLOBAL CORE / SECURITY / BILLING
Implementation: PROHIBITED until design review gate is satisfied

## Shared reviewer rules

All reviewers MUST:
- review the design only; do not write code, commit, merge, deploy or change Production;
- preserve `ROYAL_COMMAND_LAW.md` and existing good Room architecture;
- assume Legal 10 + Accounting 8 are the first implementation, with future growth to 100+ Room types;
- keep one Global Security/Billing Core and Room-specific versioned policies;
- treat missing mandatory policy as fail-closed;
- preserve Test/Sandbox vs Production hard separation;
- preserve Legal Vault / Accounting Vault separation and ShareGrant Virtual View for `bridge_la`;
- preserve provider-neutral AI and payment adapters;
- classify findings P0 / P1 / P2;
- give concrete remediation, not only criticism;
- return verdict: `APPROVE`, `APPROVE_WITH_CONDITIONS`, or `BLOCK`;
- state evidence limits and never claim repository execution without Host evidence.

## Claude — Architecture Reviewer

Review for:
1. Whether one Global Core + policy overlays is the right architecture for 100+ Rooms.
2. Whether security/billing responsibilities are cleanly separated from Room UI/domain logic.
3. Policy versioning, compatibility, migration and rollback strategy.
4. Failure-domain isolation so one Room/provider/payment issue cannot damage others.
5. Extensibility for new domains without security-code cloning.
6. Whether Universal Room Policy Contract fields are sufficient/minimal.
7. Whether central gates risk becoming a monolith/bottleneck and how to prevent it.
8. Whether Vault/ShareGrant boundaries remain composable across future domains.
9. Recommended stop point before implementation.

Required output: Architecture verdict + P0/P1/P2 + revised design recommendations.

## Gemini — Global / Country Reviewer

Review for:
1. Global expansion while Australia is current HQ for AU/NZ/South Pacific and other regions may later operate through separate local companies.
2. Separation of locale/language from legal/compliance approval.
3. Country Profile / Country Compliance Runtime design.
4. Tax/GST/VAT/sales-tax responsibilities vs payment-provider responsibilities.
5. Data residency and cross-border data/provider restrictions.
6. Currency, pricing schedule and local entity separation.
7. Jurisdiction review expiry/revalidation lifecycle.
8. Global customer portability/exit requirements.
9. Risks of assuming one legal/tax/payment model across countries.

Required output: Global-readiness verdict + P0/P1/P2 + country architecture corrections.

## Grok — Red-Team Reviewer

Attack the design for:
1. Cross-tenant data leakage.
2. Room-policy bypass/direct provider or tool invocation.
3. Test payment activating Production.
4. Webhook replay, forgery, out-of-order events and race conditions.
5. Payment just-before-suspension stale-state races.
6. Privilege escalation through ApprovalGrant/DelegationGrant.
7. ShareGrant revoke but residual vector/cache/prompt/memory access.
8. Billing Engine gaining Vault-content access.
9. AI/tool side-effect escalation.
10. Provider compromise or secret leakage.
11. Fail-open behavior when Country Policy/price/policy lookup fails.
12. Denial-of-service or central Core single-point failure.
13. Fraud/chargeback state incorrectly cleared by payment.
14. Customer changing price/product identifiers or tenant references.

Required output: adversarial verdict + exploit scenarios + P0/P1/P2 mitigations.

## Codex — Code & Security Reviewer

Repository-grounded review only. Inspect actual Royal Command code paths before verdict.

Review for:
1. Best insertion point for canonical server-side Security/Entitlement Gate.
2. Existing auth, tenant, Room membership and RLS mechanisms that must be reused rather than duplicated.
3. Existing AI execution paths and any bypass paths.
4. Current payment/service order code and `checkoutConfigured: false` gaps.
5. Exact Test/Live namespace and secret separation enforcement points.
6. Stripe webhook raw-body signature verification placement.
7. Idempotency/event-ledger/reconciliation design.
8. DB schema/RLS threat model for billing/entitlement.
9. Secret exposure and environment-variable handling.
10. Locked UI surfaces and regression risk.
11. Required automated tests and CI/security checks.
12. Minimal safe implementation sequence with Single Writer boundaries.

Required output: repository-grounded security verdict + P0/P1/P2 + exact affected paths. If Codex connector is unavailable, record `CODEX_UNAVAILABLE`; do not fabricate review.

## ChatGPT — Controller / Integrator

After independent reviews:
1. Normalize and deduplicate findings.
2. Resolve conflicts between reviewers.
3. Preserve Royal Command Law hierarchy.
4. Mark every P0 as `OPEN` or `RESOLVED` with design evidence.
5. Decide whether P1 must block lock or can defer to implementation.
6. Produce final v1.1 design candidate if changes are required.
7. Recommend `LOCK`, `LOCK_WITH_CONDITIONS`, or `BLOCK`.
8. No implementation until the lock verdict is supported by review evidence.

## Current execution status

- ChatGPT Controller repository-grounded preliminary review: EXECUTED.
- Stripe official Implementation Planner payment-architecture perspective: EXECUTED.
- Claude independent review: PENDING — direct Claude connector unavailable in current ChatGPT session.
- Gemini independent review: PENDING — direct Gemini connector unavailable in current ChatGPT session.
- Grok independent review: PENDING — direct Grok connector unavailable in current ChatGPT session.
- Codex repository/code-security review: `CODEX_UNAVAILABLE` in current ChatGPT session.

No pending reviewer is treated as completed.
