# Royal Command Room Factory V2 Contract

Status: Approved implementation contract

## Product objective

A customer chooses a Room type, creates the Room, and enters immediately. The customer must not be forced through a long configuration form for information Royal Command already knows or can safely default.

Target: every current Room type must be useful immediately for common non-connected work. External, paid, regulated or high-risk capabilities remain off until needed and explicitly approved.

## Customer-visible flow

`Room type selected → Create Room → enter immediately → AI Helper welcomes → explain what already works → customer asks anything → solve with current capability first → suggest at most two useful additions → policy/capability gate → explicit host approval when required → execute → evidence + next step`

## Non-negotiable UX rules

1. Do not ask again for known user identity, selected Room type, current language, country metadata or defaults unless the information is genuinely required and unavailable.
2. Do not show the legacy large catalogue on the primary create path.
3. The create screen is an orientation screen, not a setup questionnaire.
4. The AI Helper teaches before it interrogates.
5. Maximum one consecutive discovery question and maximum two suggestions per turn.
6. A declined suggestion must cool down before being raised again.
7. “No” or “not available” is a last resort: current capability → core workaround → free alternative → existing connector → new capability → human/specialist.
8. Casual conversational agreement is never consent to spend money, connect an external account or perform a high-risk action.

## Eight runtime layers

1. Global Core
2. Domain Profile
3. Capability Bundles
4. Connector Registry
5. Policy Runtime
6. Approval & Consent Ledger
7. Conversation AI Helper + Outcome Memory
8. Room Evolution Layer

## Global Core — automatic ON

The safe baseline is enabled when the Room is created:

- tenant/data isolation
- Room identity
- conversation history
- Primary AI
- Room Memory
- document reading/organisation
- basic public web research
- owner permission
- Human Approval gate
- Preview/Test contract

The Domain Profile may add safe R0/R1 materials to the automatic baseline.

## Connector / high-risk default — automatic OFF

The following are not activated merely because a Room is created:

- live phone and SMS
- external email send
- live payment or POS
- live external CRM/database writes
- external accounting or legal software synchronisation
- external booking/delivery systems
- CAD/BIM native systems
- specialist rendering
- satellite/provider purchases
- high-risk automation

These require Policy Runtime checks and explicit approval where applicable.

## Domain Profile contract

Every Room type must have exactly one Domain Profile containing:

- template ID
- customer-facing Room label
- Capability Bundle IDs
- up to three starter actions
- Optional Connector IDs
- safety tier
- advice boundary when regulated/high-risk

No new Room type should be added without a Domain Profile.

## Capability Bundle contract

Bundles express outcomes, not vendor products. A Bundle defines:

- stable ID
- customer outcome label
- outcomes the AI can help achieve immediately
- safe material IDs that may be enabled by default

Examples: Office, Documents, Research, Finance/Data, Customer Service, Booking, Commerce, Project, Design, Technical, Learning, Operations, Regulated Intake, Space/Data.

## Connector Registry contract

Every Connector definition must include:

- stable ID
- customer-facing label
- why it may be useful
- availability state
- default OFF
- explicit approval requirement
- mapped host material/tool when implemented

The AI must not invent provider availability or pricing. Price, permission and provider facts must come from host-owned verified data.

## Policy Runtime

Before any paid/external/high-risk suggestion can become an action, the host checks:

- country
- plan
- risk
- compliance
- permission
- cost

Failure produces a simple explanation and the safest free/available alternative.

## Two-Step Approval

Step 1: conversational suggestion.

Step 2: host-owned approval UI with the verified details. Chat text alone cannot execute the paid/external/high-risk action.

## Consent / Spend Ledger

For any paid or external action record at minimum:

- subject
- reason
- verified price
- one-time/recurring billing type
- alternatives shown
- approving user
- approval time
- Work/Evidence ID
- execution result/failure
- cancellation path shown

## Conversation State Machine

`Welcome → Orient → Listen → SolveWithCurrent → Suggest → Gate → Approval → Execute → Summarize`

Operational limits:

- no catalogue dump
- one consecutive question maximum by default
- two suggestions maximum per turn
- declined suggestion cooldown
- no upsell without an observed customer need

## Outcome Memory

Store structured outcomes separately from raw conversation history:

- goals
- decisions
- not needed
- deferred
- approvals
- preferences
- frequent work

Apply PII/sensitive-data minimisation and masking rules. The customer must be able to resume after interruption without repeating completed setup or decisions.

## Regulated/high-risk Domain rules

Legal, accounting, medical, finance, insurance, migration and other regulated profiles must declare an advice boundary. Policy Runtime can require citations, Human Approval, professional hand-off or block automatic execution by jurisdiction and action.

## Evolution Layer

Customer-specific success must not automatically become Global Core.

Promotion path:

`Customer Patch → Verified Capability → Capability Bundle / Domain Profile`

Promotion requires:

- repeated real need
- evidence of successful reuse
- customer PII removed
- security review
- regulatory review
- acceptable maintenance/cost profile

Regulated-domain customer patches never auto-promote globally.

## Definition of immediate 70–90% utility

The target describes common non-connected work, not every real-world action.

Expected immediately:

- conversation and guidance
- document upload/read/organisation
- research and summarisation
- drafts and checklists
- safe calculations and structured work
- planning and next-step guidance

Expected to require Connect/approval:

- live phone/SMS
- real payments/POS
- live external system synchronisation
- external sending
- CAD/BIM native work
- live paid provider data

## Current Room coverage

All Room templates in `src/lib/rooms/templates.ts` must resolve through `DOMAIN_PROFILES` in `src/lib/rooms/factory-v2.ts`. Unknown/new templates safely fall back to the Custom profile until a reviewed Domain Profile is added.

## Evidence / governance

- One active task → one Writer → one scope.
- Single Write Authority remains unchanged.
- Evidence before SUCCESS.
- Tenant data, memory, credentials and secrets are never cloned into reusable templates.
- Existing Room IDs, conversations, Work History and customer data must remain intact.
- Preview/build/test evidence is required before Production release.
