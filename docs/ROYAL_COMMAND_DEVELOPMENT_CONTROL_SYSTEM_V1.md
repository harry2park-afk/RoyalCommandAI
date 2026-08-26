# Royal Command Development Control System v1.2

Status: OWNER STANDARD
Owner: Royal Command Pty Ltd
Effective: 2026-08-26

## 1. Core Rule
Royal Command development must prefer stability over speed. A change is not complete merely because the requested item looks correct. It is complete only when the requested item works and all locked/core flows still work.

Operational execution is governed by `ROYAL_COMMAND_SINGLE_TASK_QUEUE_V1.md`: **Multiple Orders In, One Controlled Change Out.** AI execution authority and provider isolation are governed by `AI_EXECUTION_ISOLATION_RULES.md`.

## 2. LOCK Rule
When the owner confirms a UI surface or behavior with words such as "good", "correct", "complete", or equivalent approval, that surface becomes LOCKED.

A later PR must not alter a locked surface unless:
1. the owner explicitly requests that locked surface to change; or
2. a verified defect requires the smallest possible repair.

Every PR must state which locked surfaces it touches. If none, it must state: `Locked surfaces touched: NONE`.

## 3. One Change Rule
One task = one primary goal = one Change Ticket. A single task may have multiple provider-specific implementation PRs only when the owner explicitly assigns multiple AIs to the same goal and each provider uses an isolated `rc-work` branch.

The owner may provide many requests in one message. Those requests are split internally into the work queue; the owner is not required to repeat them one by one.

Do not combine unrelated visual, functional, architectural, dependency, and refactor work in the same PR. Discovered unrelated issues go to backlog.

## 4. One Execution Authority Rule
Royal Command must not maintain competing copies of AI execution intent rules.

- `/api/ai/chat/stream` is the Room runtime routing authority.
- `/api/ai/chat` is a JSON compatibility adapter and delegates to the stream authority.
- `/api/dev/agent` is the shared GitHub developer executor for ChatGPT, Claude, Gemini, and Grok.
- `/api/dev/gemini` is a compatibility adapter only and delegates to `/api/dev/agent` with provider `google`.
- `/api/tools/gateway/execute` must use the same host Work ID + Revision + Provider branch contract for GitHub writes.
- `/api/builder` is an explicit Codex specialist path, not the default Room execution engine.

No compatibility endpoint may reintroduce a separate master-write or provider-selection implementation.

## 5. Source-First Rule
Approved product behavior must live in React/source code whenever practical.

DOM mutation helpers and page-wide injected JavaScript are transitional only. They must not rewrite React-controlled inputs, move React-owned controls, repeatedly force scroll position, or silently change approved text/state.

New helper scripts require a written reason in the PR and must be scoped to the Room route or smaller.

## 6. Preview Before Production
Required path:

Change Ticket -> provider/feature/fix branch -> PR -> Change Control -> Quality Gate -> Vercel Preview -> smoke test -> merge to master -> Production

Direct production experimentation is prohibited except emergency rollback/recovery. AI developer execution must never write directly to `master`.

## 7. Definition of Done
A Command Room PR is Done only when all applicable items pass:

- Requested change works.
- Royal Command Change Control passes.
- Changed-code lint passes.
- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build` passes.
- Vercel Preview is READY.
- No unexpected browser popup/new tab.
- Existing locked surfaces remain unchanged.
- PR records exactly what changed and what was intentionally not changed.

## 8. Command Room Smoke Test
Before Production merge, verify:

1. Login -> Dashboard -> Command Room opens normally.
2. No unsolicited ChatGPT/external tab opens.
3. AI dock selection still works.
4. AI Warehouse opens.
5. Message composer accepts multiline text and wraps normally.
6. Send works for an available AI.
7. Chat message viewport can be manually scrolled up and down.
8. New messages may auto-scroll only when appropriate; manual reading must not be forcibly overridden.
9. New Chat and Voice controls render and remain usable.
10. Conversation title defaults to the customer's first chat text.
11. Pencil edit permits free typing and saves the customer's custom title.
12. Conversation checkbox selection works.
13. SAVE works for selected conversations.
14. DELETE works for selected conversations without confirmation popup when that is the approved behavior.
15. Left conversation list remains usable.
16. Right work sidebar remains usable.
17. Mobile/responsive layout has no obvious clipping or unreachable core controls.
18. ChatGPT, Claude, Gemini, and Grok execution routing uses the shared host policy and never silently substitutes a different provider.
19. Executable GitHub work returns a provider-scoped safe branch and host-verified commit/PR evidence.
20. JSON chat compatibility and stream chat produce the same execution routing decision.
21. Legacy Gemini development calls cannot bypass the shared developer agent.
22. Tool Gateway GitHub writes reject requests without Work ID and Provider identity.

## 9. Stable Baseline
After the Command Room smoke test passes, mark the commit in release notes as a Stable Baseline. Future regressions should first compare against that commit before adding new workaround code.

## 10. Rollback Rule
If a Production change breaks a previously locked/core flow:

1. Stop unrelated development.
2. Identify the last Stable Baseline.
3. Prefer reverting the offending PR rather than stacking patches.
4. Reproduce and repair in Preview.
5. Re-run the full smoke test before Production.

## 11. UI System Rule
Shared UI values must be centralized rather than repeatedly hard-coded in helper scripts. Common controls should use agreed tokens/components for height, border, background, typography, spacing, and state.

## 12. Work-In-Progress Limit
Maximum active development: **1 ACTIVE code-change ticket** plus 1 BLOCKED/parked item.

An explicitly authorised multi-AI implementation of that one ACTIVE ticket may use multiple provider-isolated branches/PRs. This does not authorise a second unrelated active ticket.

Research, review, and documentation may run in parallel only when they cannot alter the same shared branch or production runtime state.

## 13. Change Log Requirement
Every PR must contain Work Queue Ticket, Primary task, Batch exception, Goal, Files/components changed, Locked surfaces touched, Explicit non-goals, Verification plan, Automated test results, Preview status, manual smoke-test result where applicable, and Rollback point.

## 14. Automated Enforcement
Pull requests to `master` are subject to three controls:

1. **Royal Command Change Control** — validates the single-task PR contract and confirms the linked queue ticket is open.
2. **Royal Command Quality Gate** — validates changed-code lint, typecheck, tests, and production build.
3. **Royal Command Conflict Guard** — detects overlapping/conflicting work risks.

A failed gate means STOP: repair the active ticket before production merge.

`rc-work/**` branches are handled by the shared RC Work PR automation regardless of whether the executor is ChatGPT, Claude, Gemini, Grok, Codex specialist, or an approved Tool Gateway write.

## 15. Current Locked Command Room Surfaces
Unless the owner explicitly changes them:

- Native multiline composer layout and wrapping.
- Compact AI dock visual behavior.
- AI Warehouse placement/behavior.
- Conversation selector + SAVE/DELETE workflow.
- Conversation title editing workflow.
- Right work sidebar.
- No unsolicited external ChatGPT tab on Room entry.

This document is the default development authority for Royal Command UI and execution-control work.
