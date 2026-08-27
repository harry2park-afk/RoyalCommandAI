# ROYAL COMMAND LAW

Status: Draft for Owner Approval  
Authority: Highest project architecture and execution rule  
Scope: Royal Command global platform, all countries, all Rooms, all AI providers, all development work

## Article 1 — One Global Core
Royal Command must maintain one shared Global Core for all countries. Country expansion must not create separate country codebases or uncontrolled forks.

## Article 2 — Country Profile / Adapter Only
Country differences must be implemented through Country Profiles or approved adapters, including language, timezone, currency, domain, phone, payment, privacy, data residency, legal/regulatory requirements, and allowed AI providers.

## Article 3 — Global Expansion Method
Countries may be developed in parallel where their work is isolated and non-conflicting. Public rollout should be introduced in controlled batches, normally 4 countries at a time, with functional, security, provider, billing, privacy, performance, rollback, and country-specific compliance checks before activation.

## Article 4 — Provider Neutrality
The Global Core must remain provider-neutral. ChatGPT/OpenAI, Claude/Anthropic, Gemini/Google, Grok/xAI and future providers must connect through a Provider Registry or equivalent adapter layer. No single provider may become a mandatory platform dependency unless explicitly approved by the Owner.

## Article 5 — Country Provider Policy
Each country must have an explicit Allowed Providers policy before public production activation. A provider may be enabled only where its service, commercial terms, local availability, data handling and applicable legal requirements are acceptable for that country.

## Article 6 — Customer and Data Isolation
Production must isolate data by User → Organisation/Tenant → Room → Conversation/Task. One customer must never be able to read, modify, execute against, or inherit another customer's private data, credentials, files, memory, billing or execution state.

## Article 7 — Authentication, Secrets and Abuse Protection
Production Rooms and APIs require real customer authentication, authorization, dedicated secrets, rate limits, quota/token controls and abuse protection. API keys must never be used as session-signing secrets. Client-side storage alone is not sufficient for production customer data.

## Article 8 — FAST and BUILD Separation
FAST MODE is for answer, analysis, comparison and planning. It must not silently gain write/deploy authority. BUILD MODE is for executable development work and must use explicit execution authority, review, tests, evidence and approval gates.

## Article 9 — Parallel Work Lanes and Single Write Authority
Single Write Authority applies per Task and per conflicting resource boundary, not to the whole project globally.

Multiple AIs may execute simultaneously when their Tasks, branches, files, database objects, infrastructure state, domains or other write surfaces are explicitly isolated and non-overlapping. Each executable Task must have exactly one Writer AI or Host Executor holding write authority for that Task/resource boundary at a time.

Shared or conflicting resources must be serialized or explicitly reassigned. No two active Writers may modify the same locked or shared resource concurrently. Independent country profiles or modules may be developed in parallel when their boundaries are declared and the Global Core remains protected.

## Article 10 — Role Relay and Controlled Handoff
The preferred collaboration pattern is role relay: Spec → Plan → Write → Review → Test → Integrate → Evidence → Approval. An AI may hand a completed stage to another AI, and write authority may be explicitly reassigned between stages or Tasks. Multiple AIs must not repeatedly overwrite the same code without an explicit handoff and new resource ownership declaration.

## Article 11 — Evidence Before SUCCESS
No AI, tool or human process may declare SUCCESS without verifiable evidence appropriate to the Task. Minimum development evidence normally includes the changed diff and risk-appropriate lint/typecheck/tests/build results, with security checks when relevant.

## Article 12 — Review Limits and Conflict Resolution
Review/rework loops must have a hard limit, normally no more than 2 rework rounds. Unresolved reviewer conflict must stop automatic merge and escalate to the Integrator or Owner.

## Article 13 — Rollback and Known-Good State
Every production-affecting change must have a known-good rollback point. Failed or unsafe changes must be reversible without destroying customer data or unrelated working features.

## Article 14 — Production Approval
Preview/development work may proceed under approved Task authority. Production merge/deploy, destructive operations, security-sensitive changes, and architecture-law exceptions require explicit Owner approval unless a separately approved automation policy clearly grants that authority.

## Article 15 — Core Fix Once, Countries Inherit
A defect in shared behavior should be fixed in the Global Core once whenever technically possible, then verified across affected Country Profiles. Country-specific patches must not duplicate or diverge from core logic without a documented necessity.

## Article 16 — No Uncontrolled Country Forks
A country may not maintain its own independent copy of the platform merely for convenience. Any country-specific code branch or adapter must have a defined owner, reason, tests and reconvergence/maintenance strategy.

## Article 17 — Country Launch Gate
A country is not launch-ready until its profile has verified language/locale, currency, timezone, domain/routing, provider availability, privacy/data rules, payment/billing rules where applicable, legal/compliance requirements, support/incident route, monitoring and rollback.

## Article 18 — Cost and Reliability Controls
Multi-AI calls must have provider timeouts, failure isolation and retry limits during development. Usage metering, cost controls, approved circuit breakers/fallback policies and customer/provider quotas must be enabled before production scale where applicable. One provider failure must not corrupt the Room or another provider's result.

## Article 19 — Security and Privacy by Default
Security, least privilege, encryption, auditability, data minimisation and tenant isolation must be designed into the Global Core. Country-specific data-residency and regulatory controls must be activated before the affected country reaches public production.

## Article 20 — Competitor and Industry Pattern Rule
Royal Command may study public industry patterns, standards and product behaviours, but must not copy proprietary source code, confidential material, protected credentials, or another company's private implementation. Similar architecture patterns alone are not a reason to redesign a sound Royal Command structure.

## Article 21 — Unified Rule Gate
Every Royal Command Task must pass one central Rule Gate before execution. The Rule Gate exists to prevent scattered, repeated discovery and repair of incompatible rules after work has already started.

The Rule Gate must evaluate, as applicable:
1. Royal Command Law and approved internal policies.
2. Repository/platform rules, including GitHub, Vercel, Supabase and connected services.
3. Applicable country laws, regulations, data/privacy, consumer, payments, communications and other jurisdictional requirements.
4. AI provider/API rules, regional availability, commercial terms and technical constraints for OpenAI, Anthropic, Google, xAI and other providers.
5. Customer/tenant contractual or configuration restrictions where applicable.
6. Task resource ownership, dependency and conflict boundaries.

The Rule Gate must return a machine-readable and human-readable disposition: `ALLOW`, `ALLOW_WITH_CONDITIONS`, `OWNER_APPROVAL_REQUIRED`, `BLOCK`, or `UNKNOWN_REQUIRES_REVIEW`.

A BLOCK or unresolved UNKNOWN must prevent executable work on the affected scope. The system must identify the conflicting rule and required resolution rather than silently guessing, bypassing a rule, or repeatedly patching downstream failures.

Rule sources must be versioned or carry a freshness/status marker where practical. A lower-level workflow, prompt, AI instruction or adapter may not override a higher-authority rule silently.

## Article 22 — Change Control
Changes affecting Global Core boundaries, tenant isolation, execution authority, provider neutrality, country-profile rules, Rule Gate behavior, evidence gates or production approval must identify the affected law area and prove compliance. Small isolated development changes should use risk-proportionate checks rather than unnecessary full-process repetition.

## Article 23 — Rule Hierarchy
This file is the highest Royal Command repository governance rule. `AGENTS.md`, execution-isolation rules, recovery rules, workflows and implementation documents must comply with it. Applicable external law and binding platform/provider requirements cannot be overridden by Royal Command policy. If rules conflict, the Rule Gate must BLOCK or escalate until the conflict is resolved.

## Article 24 — Exceptions
Exceptions must be explicit, narrow, time-bounded where possible, documented with risk and rollback, and approved by the Owner when Royal Command policy permits an exception. No exception may authorize violation of binding law or non-waivable external platform/provider requirements. Silence or convenience is not approval.

## Article 25 — Amendment
This Law may be amended only through a reviewed change that states the reason, affected Articles, migration impact and rollback implications. Material amendments require Owner approval before merge.

---

## Required Work Declaration
Before executable work, the Task/PR must be able to answer:
1. Which Article(s) apply?
2. What did the Rule Gate return, and which rule sources were checked?
3. Is this Global Core, Country Profile, provider adapter, platform or other work?
4. What Work Lane is this, and what are its declared non-overlapping resource boundaries?
5. Who is the single Writer/Executor for each writable Task/resource boundary?
6. What dependencies or shared resources require serialization or handoff?
7. What data/tenant/provider/country boundaries are touched?
8. What evidence proves success?
9. What is the rollback point?
10. Does production require Owner approval?

If these cannot be answered, executable work must not begin.
