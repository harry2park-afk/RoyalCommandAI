# ROYAL COMMAND LAW

Status: Active after merge
Authority: Highest Royal Command repository governance rule
Scope: Royal Command global platform, all countries, Rooms, AI providers and development work

## Article 1 — One Global Core
Royal Command maintains one shared Global Core. Country expansion uses Country Profiles or approved adapters, not uncontrolled country forks.

## Article 2 — Country Profiles and Adapters
Language, timezone, currency, domain, phone, payment, privacy, data residency, law and other country differences belong in Country Profiles or approved adapters.

## Article 3 — Provider Neutrality
The Core remains provider-neutral. Providers connect through a Registry or equivalent adapter; none becomes mandatory without explicit approval.

## Article 4 — Risk-Proportionate Execution and Role Relay
- **FAST / LOW RISK:** one Writer when needed and the minimum relevant checks.
- **STANDARD:** one Writer per conflicting boundary, one independent Reviewer and relevant lint/type/test/build checks.
- **HIGH-RISK / REGULATED:** full applicable Rule Gate, repository evidence, Host-verified tests and at least two independent review perspectives when practical. Include Codex for code/security review when available; otherwise record `CODEX_UNAVAILABLE`.

Use the fastest safe path. The normal relay is Spec → Plan → Write → Review → Test → Integrate → Evidence → Approval; low-risk work may combine unnecessary stages. Handoffs preserve resource ownership.

## Article 5 — Parallel Lanes, Single Writer and Change Control
Single Write Authority applies per Task and conflicting resource boundary. Non-overlapping lanes may run in parallel; shared resources are serialized or explicitly handed off. Change control verifies ownership, scope, relevant checks and rollback without repeating unrelated process.

## Article 6 — Repository Grounding
STANDARD or HIGH-RISK decisions affected by repository structure use Host-verified repository/file evidence. Missing paths are labelled `NEW FILE` or `UNVERIFIED PATH`, never treated as existing.

## Article 7 — Evidence Before SUCCESS
No model, tool or process may claim a change, test, commit, deployment or system health without task-appropriate Host-verifiable evidence. Provider self-report is not evidence. Evidence strength follows risk.

## Article 8 — Review Limits
Review/rework is normally capped at two rounds. Unresolved material conflict goes to the Integrator. Repeating review without new evidence is prohibited.

## Article 9 — Unified Rule Gate
Check only relevant Royal Command policy, repository/platform requirements, binding law, provider/API rules, tenant restrictions and resource conflicts. Outcomes: `ALLOW`, `ALLOW_WITH_CONDITIONS`, `OWNER_APPROVAL_REQUIRED`, `BLOCK`, `UNKNOWN_REQUIRES_REVIEW`. Irrelevant gates must not delay FAST work; relevant gates must not be bypassed for HIGH-RISK work.

## Article 10 — Authentication, Secrets and Least Privilege
Production paths require real authentication/authorization, dedicated secrets and least privilege. Provider keys are not session secrets. Models receive neither raw infrastructure credentials nor unrestricted mutation authority.

## Article 11 — Tenant and Data Isolation
Production data is isolated by User → Organisation/Tenant → Room → Conversation/Task or equivalent enforcement. A tenant cannot access another tenant's data, credentials, memory, billing or execution state.

## Article 12 — Controlled Host Executor
Provider AIs propose or review; an approved Host Executor controls infrastructure mutation and enforces resource ownership, applicable Rule Gate outcomes and evidence requirements.

## Article 13 — Rollback and Recovery
Production-affecting changes require a verified known-good rollback point proportionate to risk. Rollback and recovery must preserve customer data and unrelated working features. Recovery evidence is maintained under the Daily Recovery rules.

## Article 14 — Production Approval
The Owner may approve a defined sequence or phase. Do not repeat approval requests inside that scope unless it becomes destructive, materially expands, requires separate external confirmation, reveals a new high-severity risk, or needs an Owner-supplied secret/value.

## Article 15 — Cost, Reliability and Efficient Communication
Use multiple models only when they materially reduce risk or time. Apply suitable timeouts, failure isolation, retry and cost limits. Answers and work orders must be short and accurate without omitting meaning, conditions or safety. Suggest a materially better or safer method briefly before execution. Avoid repetition and verbosity; these rules must not impair sound judgment or execution speed.

## Article 16 — Core Fix Once
Fix shared defects once in Global Core when appropriate. Country-specific patches require documented necessity and remain overlays.

## Article 17 — Security and Privacy by Default
Build security, privacy, auditability, data minimisation and tenant isolation into the Core without unnecessarily slowing unrelated low-risk work.

## Article 18 — Binding External Rules
Binding law and non-waivable platform/provider requirements override internal policy. Stop or redesign only the affected scope; isolated unrelated work may continue.

## Article 19 — Rule Hierarchy, Exceptions and Amendments
This Law is the highest repository governance rule. Lower rules must comply and may not add broader blocking without a specific risk. Exceptions are explicit, narrow and documented and never override binding law. Material amendments require reviewed repository changes and should simplify or strengthen controls based on evidence.

## Article 20 — Preview-First Development and Promotion
All changes use a controlled branch with Vercel Preview, or an explicitly approved equivalent, before Production. RC/RCA Production is not an experimental workspace.

- Australia-specific behavior is verified in Preview, then promoted to RCA.
- Shared international behavior is verified in Preview, then promoted to RC Master.
- RCA-proven shared features move to Core only after Australia-specific content is separated into approved overlays.
- Shared features are not independently rebuilt by country.
- Direct Production changes are prohibited except approved emergency hotfixes with rollback evidence.
- Promotion requires risk-appropriate checks, exact tested-head evidence where applicable and a known-good rollback point.

Default path: `Branch/Preview → verify → promote to RCA or RC Master → inherit through country overlays`.

## Required Work Declaration
Record only fields relevant to the selected risk path:
1. Risk class.
2. Work Lane and writable boundary.
3. Single Writer for each conflicting resource.
4. Required reviewers and evidence/tests.
5. Rollback point when Production-affecting.
6. Whether continuing Owner approval covers the scope.
7. `CODEX_AVAILABLE`, `CODEX_UNAVAILABLE`, or `CODEX_NOT_REQUIRED` when relevant.

Irrelevant fields must not become blocking paperwork.
