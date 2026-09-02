# Global Room Security & Billing Review Record

Date: 2026-09-02 Australia/Sydney
Work Lane: `RC-20260902-GLOBAL-ROOM-SECURITY-BILLING`
Risk: HIGH-RISK
Writer: ChatGPT / OpenAI connector path
Writable boundary: new design/review docs only
Rollback point: `master` baseline before this branch
Continuing Owner approval: YES for this design sequence

## Repository-grounded sources reviewed

- `ROYAL_COMMAND_LAW.md`
- Existing Professional Room Billing & Entitlement Contract v1.0 on the isolated billing branch
- Existing Royal Command rules already governing Single Write Authority, evidence-before-success, tenant isolation, provider neutrality and HIGH-RISK review paths

## External specialist evidence available in this session

### Stripe Implementation Planner
Status: EXECUTED

Relevant conclusions used in the Global Contract:
- use Stripe Billing/Subscriptions for Royal Command's own SaaS charging path;
- use hosted/tokenized payment UI rather than storing raw card data;
- use server/webhook-driven lifecycle evidence;
- test and live environments must be separated;
- recurring billing/revenue recovery require lifecycle handling rather than browser-success trust.

A successful Stripe Test Mode subscription/invoice flow was separately observed in this session. This is sandbox evidence only and is not Production evidence.

## AI role execution status

### ChatGPT — Controller / Integrator / repository-grounded design
Status: EXECUTED

Scope:
- unify 100+ Room security/billing under one Global Core;
- define Universal Room Policy Contract;
- define fail-closed creation/runtime gates;
- define LIVE/TEST P0 isolation;
- preserve Legal/Accounting Vault separation and bridge_la virtual sharing;
- preserve provider neutrality;
- define rollout sequence and evidence expectations.

### Claude — Architecture Reviewer
Status: UNAVAILABLE_IN_CURRENT_SESSION
Reason: no authenticated Claude/Anthropic execution connector or installed tool exposed to this session.
Disposition: no Claude result claimed.

### Gemini — Global/Country/Scale Reviewer
Status: UNAVAILABLE_IN_CURRENT_SESSION
Reason: no authenticated Gemini/Google execution connector or installed tool exposed to this session.
Disposition: no Gemini result claimed.

### Grok — Red-Team / Conflict Reviewer
Status: UNAVAILABLE_IN_CURRENT_SESSION
Reason: no authenticated Grok/xAI execution connector or installed tool exposed to this session.
Disposition: no Grok result claimed.

### Codex — Code/Security Reviewer
Status: `CODEX_UNAVAILABLE`
Reason: GitHub connector is available but exposes no callable Codex execution/review action in this session. Repository Law explicitly permits recording `CODEX_UNAVAILABLE` rather than fabricating evidence.
Disposition: NO live Codex review claimed. Production/code merge gates that require actual independent code/security review remain unresolved.

## Controller findings

### P0-1 — Do not implement security independently per Room
Disposition: RESOLVED IN DESIGN
One Global Security & Billing Core + versioned Room Policy is mandatory.

### P0-2 — Test payments must never activate Production
Disposition: RESOLVED IN DESIGN
Production Entitlement Gate requires LIVE provider/account/event evidence and rejects sandbox/test identifiers and secrets.

### P0-3 — Billing must not access Vault content
Disposition: RESOLVED IN DESIGN
Only minimum billing metadata is allowed.

### P0-4 — Missing Room policy must fail closed
Disposition: RESOLVED IN DESIGN
No Production activation when mandatory Room policy references are missing/expired/unapproved.

### P0-5 — 100+ Rooms must inherit common controls
Disposition: RESOLVED IN DESIGN
Room Factory creation gate validates policy references and prohibits cloned security implementations.

### P0-6 — Payment and security state must be server authoritative
Disposition: RESOLVED IN DESIGN
UI/browser success state is not authority. Signed provider evidence/reconciliation and server policy decisions are required.

## Gate status

- Global Contract drafted: PASS
- Repository grounding: PASS
- Stripe specialist planner: PASS for payment architecture perspective
- Independent Claude review: NOT RUN / unavailable
- Independent Gemini review: NOT RUN / unavailable
- Independent Grok review: NOT RUN / unavailable
- Live Codex review: `CODEX_UNAVAILABLE`
- Production code change: NONE
- Production deployment: NONE

## Next required execution

1. Map Legal 10 + Accounting 8 to Universal Room Policy records.
2. Threat-model current Auth/RLS/Billing/Room Factory before DB migration.
3. Implement central server-side entitlement/security decision layer on an isolated branch.
4. Add persistent tenant-isolated ledger/entitlement schema only after schema/RLS review.
5. Add Stripe webhook LIVE/TEST hard separation and reconciliation.
6. Obtain actual independent code/security review before Production promotion.
