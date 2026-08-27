# ROYAL COMMAND LAW

Status: Draft for Owner Approval  
Authority: Highest project architecture and execution rule  
Scope: Royal Command global platform, all countries, all Rooms, all AI providers, all development work

## Article 1 — One Global Core
Royal Command must maintain one shared Global Core for all countries. Country expansion must not create separate country codebases or uncontrolled forks.

## Article 2 — Country Profile / Adapter Only
Country differences must be implemented through Country Profiles or approved adapters, including language, timezone, currency, domain, phone, payment, privacy, data residency, legal/regulatory requirements, and allowed AI providers.

## Article 3 — Global Expansion Method
Countries must be introduced in controlled batches, normally 4 countries at a time. Each batch must pass functional, security, provider, billing, privacy, performance, rollback, and country-specific compliance checks before the next batch begins.

## Article 4 — Provider Neutrality
The Global Core must remain provider-neutral. ChatGPT/OpenAI, Claude/Anthropic, Gemini/Google, Grok/xAI and future providers must connect through a Provider Registry or equivalent adapter layer. No single provider may become a mandatory platform dependency unless explicitly approved by the Owner.

## Article 5 — Country Provider Policy
Each country must have an explicit Allowed Providers policy. A provider may be enabled only where its service, commercial terms, local availability, data handling and applicable legal requirements are acceptable for that country.

## Article 6 — Customer and Data Isolation
Production must isolate data by User → Organisation/Tenant → Room → Conversation/Task. One customer must never be able to read, modify, execute against, or inherit another customer's private data, credentials, files, memory, billing or execution state.

## Article 7 — Authentication, Secrets and Abuse Protection
Production Rooms and APIs require real customer authentication, authorization, dedicated secrets, rate limits, quota/token controls and abuse protection. API keys must never be used as session-signing secrets. Client-side storage alone is not sufficient for production customer data.

## Article 8 — FAST and BUILD Separation
FAST MODE is for answer, analysis, comparison and planning. It must not silently gain write/deploy authority. BUILD MODE is for executable development work and must use explicit execution authority, review, tests, evidence and approval gates.

## Article 9 — Single Write Authority
For one executable Task, exactly one Writer AI or Host Executor may hold write authority at a time. Other AIs may plan, review, challenge or test, but must not concurrently modify the same Task resources.

## Article 10 — Role Relay, Not Code Relay
The preferred collaboration pattern is role relay: Spec → Plan → Write → Review → Test → Integrate → Evidence → Approval. Multiple AIs must not repeatedly overwrite the same code without explicit re-assignment of write authority.

## Article 11 — Evidence Before SUCCESS
No AI, tool or human process may declare SUCCESS without verifiable evidence appropriate to the Task. Minimum development evidence normally includes the changed diff, required lint/typecheck/tests/build results, and security checks when relevant.

## Article 12 — Review Limits and Conflict Resolution
Review/rework loops must have a hard limit, normally no more than 2 rework rounds. Unresolved reviewer conflict must stop automatic merge and escalate to the Integrator or Owner.

## Article 13 — Rollback and Known-Good State
Every production-affecting change must have a known-good rollback point. Failed or unsafe changes must be reversible without destroying customer data or unrelated working features.

## Article 14 — Production Approval
Production merge/deploy, destructive operations, security-sensitive changes, and architecture-law exceptions require explicit Owner approval unless a separately approved automation policy clearly grants that authority.

## Article 15 — Core Fix Once, Countries Inherit
A defect in shared behavior should be fixed in the Global Core once whenever technically possible, then verified across affected Country Profiles. Country-specific patches must not duplicate or diverge from core logic without a documented necessity.

## Article 16 — No Uncontrolled Country Forks
A country may not maintain its own independent copy of the platform merely for convenience. Any country-specific code branch or adapter must have a defined owner, reason, tests and reconvergence/maintenance strategy.

## Article 17 — Country Launch Gate
A country is not launch-ready until its profile has verified language/locale, currency, timezone, domain/routing, provider availability, privacy/data rules, payment/billing rules where applicable, legal/compliance requirements, support/incident route, monitoring and rollback.

## Article 18 — Cost and Reliability Controls
Multi-AI calls must have provider timeouts, failure isolation, retry limits, circuit-breaker/fallback rules where approved, usage metering and customer/provider cost controls. One provider failure must not corrupt the Room or another provider's result.

## Article 19 — Security and Privacy by Default
Security, least privilege, encryption, auditability, data minimisation, tenant isolation and applicable data-residency requirements must be designed into the Global Core and Country Profiles before mass rollout, not added after deployment.

## Article 20 — Competitor and Industry Pattern Rule
Royal Command may study public industry patterns, standards and product behaviours, but must not copy proprietary source code, confidential material, protected credentials, or another company's private implementation. Similar architecture patterns alone are not a reason to redesign a sound Royal Command structure.

## Article 21 — Change Control
Any change affecting Global Core boundaries, tenant isolation, execution authority, provider neutrality, country-profile rules, evidence gates or production approval must state which Article it affects and prove that the change complies with this Law.

## Article 22 — Rule Hierarchy
This file is the highest Royal Command repository governance rule. `AGENTS.md`, execution-isolation rules, recovery rules, workflows and implementation documents must comply with it. If a lower rule conflicts with this Law, work must stop until the conflict is resolved.

## Article 23 — Exceptions
Exceptions must be explicit, narrow, time-bounded where possible, documented with risk and rollback, and approved by the Owner. Silence or convenience is not approval.

## Article 24 — Amendment
This Law may be amended only through a reviewed change that states the reason, affected Articles, migration impact and rollback implications. Material amendments require Owner approval before merge.

---

## Required Work Declaration
Before executable work, the Task/PR must be able to answer:
1. Which Article(s) apply?
2. Is this Global Core or Country Profile work?
3. Who is the single Writer/Executor?
4. What data/tenant/provider/country boundaries are touched?
5. What evidence proves success?
6. What is the rollback point?
7. Does production require Owner approval?

If these cannot be answered, executable work must not begin.
