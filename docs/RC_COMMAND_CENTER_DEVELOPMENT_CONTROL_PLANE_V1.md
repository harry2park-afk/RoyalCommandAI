# RC Command Center Development Control Plane v1

Status: DESIGN CONTRACT — READ-ONLY FOUNDATION
Scope: Harry's internal RC Command Center only (`/rooms/rca`)
Customer Rooms: explicitly excluded
Production: no direct modification authorized by this contract

## 1. Purpose

This contract fixes the operating structure for building and maintaining Royal Command through one internal command workspace. It does not lock Harry out of the workspace and it does not freeze future feature development. It locks the safety, role, evidence, and promotion rules that future development must obey.

Harry may continue to open the RC Command Center, give orders, inspect results, test Preview, and approve changes. New features may be added on top of this contract without changing the contract unless Harry explicitly approves a versioned contract revision.

## 2. One development entry point

Harry's normal development workflow has one visible operational entry point: RC Command Center (`/rooms/rca`).

Internal branches, previews, CI runs, evidence collectors, and provider-specific work may exist behind the scenes, but they must not force Harry to manage multiple AI browser tabs or multiple development rooms for the same task.

Customer UUID Rooms remain separate from this internal developer workspace.

## 3. Fixed internal 5-AI team

The internal RC development team is fixed as:

- ChatGPT — Controller / Final Integrator
- Claude — Architecture / UX Reviewer
- Gemini — Global / Product Reviewer
- Grok — Red-Team Reviewer
- Codex — Implementation Writer / Single Writer

These five roles are for Harry's internal website-development workflow. They are not the default AI package for customer Rooms and must not bypass customer AI billing, entitlement, or selection rules.

## 4. Single Writer rule

For any repository mutation, only one writer may hold write authority for a task.

Default writer: Codex.

ChatGPT, Claude, Gemini, and Grok are review-only for repository mutation tasks. They may inspect, analyze, review evidence, identify risk, and propose corrections, but they must not independently write competing code for the same task.

If Codex is unavailable, the system must not silently appoint another AI as writer for Harry's RC development workflow. It must fail closed or require an explicit Harry-approved exception.

## 5. Mode separation

Every order must be classified before execution:

### ANSWER
Reasoning, explanation, design discussion. No repository mutation.

### INSPECT / REVIEW
Read-only investigation. No code change, commit, branch mutation, PR mutation, merge, Vercel deployment, database write, or Production change.

### EXECUTE
Mutation is allowed only when Harry's current order explicitly authorizes implementation or change. EXECUTE still does not imply Production permission.

Ambiguity defaults to read-only.

## 6. Evidence-first rule

AI statements are not evidence.

Claims such as "fixed", "passed", "connected", "deployed", "session stable", "all five AIs worked", or "Production healthy" require host-verifiable evidence appropriate to the claim.

Evidence may include:

- repository path and exact file contents
- base/head commit SHA
- changed-file diff
- PR metadata
- CI / Conflict Guard result
- Vercel Preview state and deployment ID
- runtime logs
- database evidence where relevant
- authenticated browser validation by Harry where visual behavior is required

No evidence = no SUCCESS claim.

## 7. Evidence Collector boundary

The Control Plane must treat evidence collection as a separate host capability from AI opinion generation.

AI reviewers may receive verified evidence supplied by the host layer. They must not pretend they inspected GitHub, Vercel, browser state, database state, or runtime logs when such evidence was not actually provided.

The long-term target is:

Harry Order -> Controller -> Evidence Collector -> Independent Reviews -> Controller Synthesis -> Codex Single Writer -> Post-change Evidence -> Preview -> Harry Approval.

## 8. Review order and collaboration

For STANDARD/HIGH-RISK implementation tasks, the preferred collaboration path is:

1. ChatGPT Controller interprets Harry's current order and locks scope.
2. Host Evidence Collector gathers current repository/runtime evidence.
3. Claude, Gemini, and Grok review independently and preferably in parallel.
4. ChatGPT Controller reconciles conflicting findings into one bounded implementation direction.
5. Codex performs the smallest coherent change as Single Writer.
6. Host Evidence Collector verifies changed files, commit, CI, Preview, and regressions.
7. Reviewers may re-check the evidence if the task warrants it.
8. Harry validates the single user-facing Preview.
9. Only after required checks and Harry approval may promotion be considered.

FAST tasks may use a reduced review set only where governance already permits it. REGULATED/CRITICAL tasks may require additional human or specialist gates.

## 9. Parallelism and speed

Safety does not require avoidable slowness.

Independent evidence reads and independent reviewer analysis should run in parallel where possible. Provider failures should be isolated with bounded timeouts. One slow reviewer must not create indefinite blocking.

Sequential stages should exist only where there is a real dependency, for example: evidence before evidence-based review, synthesis before final writer change, and implementation before post-change verification.

Do not trade away Single Writer, evidence, tenant separation, or Production gates merely to reduce latency.

## 10. Preview-first rule

All normal development changes use an isolated branch and Preview before Production.

Harry should see one stable user-facing Preview lane for the current RC Command Center workflow. Internal hardening previews may exist but must not become separate Harry-facing workspaces.

Production is never implied by EXECUTE.

## 11. Production promotion

Promotion to RC Master / Production requires the applicable governance checks, rollback evidence, Preview validation, and explicit Harry approval.

A successful Preview is not a Production success claim.

RC Master remains the global common core. Country-specific differences must remain in Country Pack / Policy / Configuration / Locale Overlay rather than being copied into separate country applications.

## 12. Customer separation

The RC Command Center fixed five-member team must never become the default customer Room AI configuration.

Customer Room AI access is governed separately by customer entitlements, paid AI selection, billing, plan, country policy, and Room configuration.

Internal development privileges, writer authority, host evidence access, admin tools, and protected layout tools must not leak into customer Rooms.

## 13. Locked invariants

The following are contract invariants and may not be changed incidentally by feature work:

- One Harry-facing RC Command Center development entry point
- Fixed internal role contract for ChatGPT / Claude / Gemini / Grok / Codex
- Codex Single Writer for normal RC development mutation
- REVIEW / INSPECT are non-writing modes
- Evidence required for SUCCESS claims
- Customer Room separation
- Preview-first normal development
- Production requires explicit approval and governance gates
- RC Master remains one shared global core
- No silent fallback that gives another reviewer Codex's write authority

## 14. What this contract does NOT lock

This contract does not prevent:

- opening or using RC Command Center
- adding new product features
- improving the language picker
- improving Legal / Accounting / other professional Rooms
- adding new AI providers to customer offerings
- changing UI appearance through approved tools
- improving speed
- adding better automated QA
- adding new host evidence connectors
- revising this contract through a new version explicitly approved by Harry

## 15. Change procedure for this contract

Any proposed change to a locked invariant requires:

1. explicit identification of the invariant being changed
2. reason for the change
3. independent architecture / product / red-team review as applicable
4. evidence of impact on existing RC / RCA / customer behavior
5. a versioned replacement contract (v1.1, v2, etc.)
6. Harry's explicit approval before implementation

Silent or incidental modification is prohibited.

## 16. Current implementation note

The existing `rcMemberLayer.ts` already contains the fixed five provider IDs, the fixed role descriptions, REVIEW/INSPECT versus EXECUTE separation, Codex-preferred Single Write Authority, parallel-review intent, Preview/Production safety wording, and evidence-required success rules. This contract formalizes those principles as the governing design baseline for the next Control Plane implementation phase.

## 17. Fresh multi-AI review status

This document is a design contract created from verified repository structure plus previously supplied role-review material. It must not be represented as a fresh, host-verified five-provider independent review unless the RC Command Center actually executes those providers and records evidence of their independent outputs.

Before any major Control Plane implementation beyond this contract, the target system should perform a real read-only role review using the fixed five-member architecture and host-supplied evidence.

---

Approved intent: make Royal Command easier for Harry to build from one place while preserving evidence, single-writer safety, customer separation, Preview-first development, and RC Master integrity.
