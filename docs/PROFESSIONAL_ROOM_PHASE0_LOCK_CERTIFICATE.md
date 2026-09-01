# Professional Room Phase 0 Lock Certificate

Date: 2026-09-02 Australia/Sydney
Program: Royal Command Legal + Accounting Professional Room
Contract: `docs/PROFESSIONAL_ROOM_DESIGN_CONTRACT_V2_3.md`

## Effective status

`DESIGN CONTRACT v2.3 = PHASE 0 LOCKED`

The earlier header text `PHASE 0 LOCK CANDIDATE` in the contract is superseded by this certificate and the Phase 0 review/acceptance records on the same branch. The substantive v2.3 principles are not reopened by this certificate.

## Locked principles

- Legal base rooms = 10.
- Accounting base rooms = 8.
- Specialty Pack architecture preserved.
- AI Secretary = Digital Worker.
- High-risk professional judgment = Candidate -> Human Confirmation.
- External side effects = DEFAULT DENY.
- Legal Vault / Accounting Vault remain separate.
- `bridge_la` = coordination Product ID only; no vault merge.
- Shared = ShareGrant Virtual View, not third datastore.
- ShareGrant revoke/expiry cascades through Vector DB, Embedding, Search Index, Cache, Prompt Context, AI Memory and Derived Copy/materialised derivatives.
- Unified Authority / Policy Engine governs professional authority.
- RBAC + ABAC + Matter ACL + Separation of Duties remain required.
- ApprovalGrant and DelegationGrant remain separate formal authorities.
- Passkey/WebAuthn preferred for high-risk access; Recovery/Break-glass controlled and audited.
- Country Compliance Runtime + Jurisdictional Review Registry remain fail-closed.
- Canonical ConnectorContract required; unverified provider is not Connected.
- Evidence Chain required; AI self-report is not execution evidence.
- Cost Governor / Usage Ledger use minimum Billing Metadata.
- Customer Exit / Portability preserved.
- Customer-Owned Number where supported; carrier service remains regulated carrier layer.
- Direct Carrier Billing default where feasible; RC Management Fee separate.
- Phone Marketplace MVP = 1 provider / 1-2 verified countries.
- Country Pack absent/unverified or LEGAL REVIEW REQUIRED => affected high-risk capability OFF.
- existing approved RC structure/UI/history/memory/customer data remain protected.
- Single Writer per conflicting resource boundary.
- Preview/Test before Production.
- no direct `master` write.
- no Evidence-free SUCCESS.

## Change rule after lock

A later implementation task may refine technical mechanics without changing the locked principles above.

A material change to any locked principle requires:

1. explicit Change Ticket / design amendment;
2. impact analysis;
3. HIGH-RISK review where applicable;
4. owner scope coverage;
5. updated evidence before implementation.

No implementation agent may silently reinterpret or weaken a locked principle.

## Phase 1 readiness

The following design artifacts now exist on the same isolated branch:

- complete 18-room Capability / Safety / Default ON-OFF Matrix;
- Billing Metadata allowlist;
- implementation Impact Map / Locked Surfaces;
- Acceptance Gate;
- Phase 0 repository-grounded review record.

Phase 1 design baseline is complete. Runtime implementation remains NOT STARTED under this certificate.

## Codex / independent implementation review condition

The repository contains an authenticated explicit Codex specialist route at `/api/builder`. This connector session cannot impersonate the protected Royal Command developer session, so this certificate does not claim that a live Codex model review was executed.

Before the first HIGH-RISK implementation merge, live Codex code/security review is mandatory and must be recorded with Host-verifiable evidence. Any P0 finding blocks that merge until resolved.

## Verification note

PR #623 metadata was normalized to the repository Change Control contract before this evidence refresh so the exact-head governance workflows can rerun against the required PR sections.

## Production

`PRODUCTION CHANGE = NONE`

This lock is a design-governance state only. It does not activate, deploy or expose any of the 18 Professional Rooms.
