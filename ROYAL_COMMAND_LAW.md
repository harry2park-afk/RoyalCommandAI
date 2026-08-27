# ROYAL COMMAND LAW

Status: Active after merge
Authority: Highest Royal Command repository governance rule
Scope: Royal Command global platform, all countries, Rooms, AI providers and development work

## Article 1 — One Global Core
Royal Command maintains one shared Global Core. Country expansion must use Country Profiles or approved adapters, not uncontrolled country forks.

## Article 2 — Country Profile / Adapter
Country differences such as language, timezone, currency, domain, phone, payment, privacy, data residency, legal/regulatory requirements and allowed providers belong in Country Profiles or approved adapters.

## Article 3 — Provider Neutrality
The Global Core remains provider-neutral. OpenAI, Anthropic, Google, xAI and future providers connect through a Provider Registry or equivalent adapter. No provider becomes a mandatory platform dependency without explicit approval.

## Article 4 — FAST / STANDARD / HIGH-RISK execution paths
Safety controls must be proportional to risk. The system must not run every available gate, reviewer or AI on every task.

### FAST / LOW RISK
Use for answers, analysis, planning and small isolated code changes with no security, auth, billing, database schema, tenant, destructive, regulated, production-infrastructure or Global Core boundary impact.

Default path: one Writer when writing is needed + only the minimum automated checks appropriate to the changed surface. Multi-AI review, repository-grounded review and full Rule Gate expansion are optional, not mandatory.

### STANDARD BUILD
Use for ordinary implementation work with moderate integration risk.

Default path: one Writer per conflicting resource boundary + one independent Reviewer + risk-appropriate lint/typecheck/tests/build. Add more reviewers only when a concrete risk justifies them.

### HIGH-RISK / REGULATED
Use for authentication, authorization, secrets, tenant isolation, database schema/RLS, payments, production infrastructure, destructive changes, regulated features, major Global Core architecture, execution authority and comparable high-impact changes.

Default path: full Rule Gate + repository-grounded evidence + at least two independent review perspectives when practical + Host-verified tests/evidence. Codex should be included for code/security inspection when an actual Codex execution/review connector is available. If Codex is unavailable, record `CODEX_UNAVAILABLE` and use available independent reviewers instead.

The Controller must prefer the fastest path that is safe for the actual risk. Adding gates without a concrete risk reason is itself a process defect.

## Article 5 — Parallel Work Lanes / Single Write Authority
Single Write Authority applies per Task and per conflicting resource boundary, not to the whole project. Multiple isolated, non-overlapping Work Lanes may execute in parallel. Shared or conflicting resources must be serialized or explicitly handed off.

## Article 6 — Role Relay
Preferred collaboration is Spec → Plan → Write → Review → Test → Integrate → Evidence → Approval, but low-risk work may collapse unnecessary stages. A handoff must preserve declared resource ownership.

## Article 7 — Repository Grounding
For STANDARD or HIGH-RISK work where repository structure affects the decision, reviewers should use a Host-verified repository snapshot or verified file evidence. A path not present in verified evidence must be labelled `NEW FILE` or `UNVERIFIED PATH` and may not be treated as an existing repository file.

## Article 8 — Evidence Before SUCCESS
No AI, tool or process may declare SUCCESS without evidence appropriate to the task. Evidence must be risk-proportionate: small isolated work needs only the checks that can actually detect its likely failures; high-risk work requires stronger evidence.

## Article 9 — Review Limits
Review/rework loops are normally capped at two rounds. Unresolved material conflict escalates to the Integrator. Repeating reviewers without new evidence is prohibited.

## Article 10 — Unified Rule Gate
The Rule Gate checks only the rule sources relevant to the task: Royal Command Law/internal policy, repository/platform requirements, applicable country law/regulation, provider/API requirements, tenant/customer restrictions and resource/dependency conflicts.

Allowed dispositions are `ALLOW`, `ALLOW_WITH_CONDITIONS`, `OWNER_APPROVAL_REQUIRED`, `BLOCK`, and `UNKNOWN_REQUIRES_REVIEW`.

FAST/LOW-RISK work must not be delayed by irrelevant Rule Gate checks. HIGH-RISK work must not bypass relevant checks.

## Article 11 — Authentication, Secrets and Least Privilege
Production execution paths require real authentication/authorization, dedicated secrets and least privilege. Provider API keys must not be reused as session-signing secrets. AI models do not receive raw infrastructure credentials or unrestricted mutation authority.

## Article 12 — Tenant and Data Isolation
Production data must be isolated by User → Organisation/Tenant → Room → Conversation/Task or an equivalent enforced hierarchy. One tenant must not read, modify or execute against another tenant's private data, credentials, memory, billing or execution state.

## Article 13 — Host Executor
Provider AIs propose or review work; infrastructure mutation authority belongs to an approved Host Executor or equivalent controlled host path. The Host must enforce declared resource ownership, relevant Rule Gate results and required evidence.

## Article 14 — No Evidence-Free SUCCESS
A provider response, self-report or model statement is never sufficient evidence that a file changed, a test passed, a commit exists, a deployment succeeded or production is healthy. Those claims require Host-verifiable evidence.

## Article 15 — Rollback
Production-affecting changes require a known-good rollback point appropriate to the risk. Rollback design must avoid destroying customer data or unrelated working features.

## Article 16 — Production Approval Policy
The Owner may grant approval for a defined sequence or project phase, not only one PR at a time. Once the Owner explicitly grants continuing approval for that defined scope, repeated approval requests inside the same scope are prohibited unless:
- the action becomes destructive or materially expands the approved scope,
- binding external law/platform policy requires separate confirmation,
- a new unknown/high-severity risk appears,
- or a required credential/secret/value must be supplied by the Owner.

This rule exists to prevent approval loops from becoming a development bottleneck.

## Article 17 — Cost and Reliability
Multi-AI use must be purposeful. More models are not automatically safer. Use parallel models when their independent perspective materially reduces risk or time. Timeouts, failure isolation, retry limits and token/cost controls should match the task risk and service stage.

## Article 18 — Core Fix Once
Shared defects should be fixed in Global Core once where technically appropriate, then inherited by Country Profiles. Country-specific patches require a documented necessity.

## Article 19 — Security and Privacy by Default
Security, privacy, auditability, data minimisation and tenant isolation are designed into the Core, but controls must be implemented without unnecessarily slowing unrelated low-risk work.

## Article 20 — External Rules
Binding country law and non-waivable platform/provider requirements cannot be overridden by Royal Command policy. If a true conflict exists, the affected scope must stop or be redesigned; unrelated work should continue when isolated.

## Article 21 — Change Control
Change Control must verify task ownership, scope and rollback evidence without forcing unrelated full-process repetition. Small isolated changes use lightweight checks. High-risk changes use the full applicable path.

## Article 22 — Rule Hierarchy
This file is the highest Royal Command repository governance rule. `AGENTS.md`, execution-isolation rules, workflows and implementation documents must comply with it. Lower-level rules that impose broader blocking or slower process than this Law without a specific risk justification must be updated.

## Article 23 — Exceptions
Exceptions are explicit, narrow and documented. No exception may violate binding law or non-waivable external requirements.

## Article 24 — Amendment
Material changes to this Law require a reviewed repository change. Amendments should simplify or strengthen controls based on evidence, not add process for its own sake.

---

## Required Work Declaration
For executable work, record only what is necessary for the selected risk path:
1. Risk class: FAST / STANDARD / HIGH-RISK.
2. Task/Work Lane and writable resource boundary.
3. Single Writer/Executor for each conflicting resource.
4. Required reviewer count for this risk class.
5. Required evidence/tests.
6. Rollback point when production-affecting.
7. Whether continuing Owner approval already covers this scope.
8. `CODEX_AVAILABLE`, `CODEX_UNAVAILABLE`, or `CODEX_NOT_REQUIRED` when code/security review relevance justifies recording it.

If a field is irrelevant to the selected risk class, it should not become a blocking paperwork requirement.
