# Royal Command Development Control System v1.2

Status: OWNER STANDARD
Owner: Royal Command Pty Ltd
Effective: 2026-08-26

## 1. Core Rule
Royal Command development must prefer stability over speed. A change is not complete merely because the requested item looks correct. It is complete only when the requested item works and all locked/core flows still work.

Operational execution is governed by `ROYAL_COMMAND_SINGLE_TASK_QUEUE_V1.md`: **Multiple Orders In, One Controlled Change Out.** AI execution authority and provider isolation are governed by `AI_EXECUTION_ISOLATION_RULES.md`.

## 2. LOCK Rule
When the owner confirms a UI surface or behavior with words such as "good", "correct", "complete", or equivalent approval, that surface becomes LOCKED.

A later PR must not alter a locked surface unless the owner explicitly requests it or a verified defect requires the smallest possible repair. Every PR must state which locked surfaces it touches; otherwise state `Locked surfaces touched: NONE`.

## 3. One Change Rule
One task = one primary goal = one Change Ticket. A single task may have multiple provider-specific implementation PRs only when the owner explicitly assigns multiple AIs to the same goal and each provider uses an isolated `rc-work` branch.

The owner may provide many requests in one message. Those requests are organised internally; the owner is not required to repeat them one by one. Do not combine unrelated work in the same active ticket.

## 4. One Execution Authority Rule
Royal Command must not maintain competing copies of AI execution intent rules.

- `/api/ai/chat/stream` is the Room runtime routing authority.
- `/api/ai/chat` is a JSON compatibility adapter and delegates to the stream authority.
- `/api/dev/agent` is the shared GitHub developer executor for ChatGPT, Claude, Gemini, and Grok.
- `/api/dev/gemini` is a compatibility adapter only and delegates to `/api/dev/agent` with provider `google`.
- `/api/tools/gateway/execute` uses the same host Work ID + Revision + Provider branch contract for GitHub writes.
- `/api/builder` is explicit Codex specialist analysis only and has no GitHub writer.
- `rc-work/**` pushes use one provider-aware RC Work PR automation.

No compatibility endpoint may reintroduce a separate master-write or provider-selection implementation.

## 5. Preview Before Production
Required path:

Change Ticket -> provider/feature/fix branch -> PR -> Change Control -> Conflict Guard -> Quality Gate -> Vercel Preview -> smoke test -> merge to master -> Production

Direct production experimentation is prohibited except emergency rollback/recovery. AI developer execution must never write directly to `master`.

## 6. Definition of Done
A Command Room execution-system PR is Done only when all applicable items pass:

- Requested routing/execution change works.
- Royal Command Change Control passes.
- Royal Command Conflict Guard passes.
- Changed-code lint passes.
- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build` passes.
- Vercel Preview is READY.
- Existing locked surfaces remain unchanged.
- PR records exactly what changed and what was intentionally not changed.

## 7. Execution-System Smoke Test
Before Production merge, verify:

1. Login -> Dashboard -> Command Room opens normally.
2. Normal read-only AI chat remains non-executing.
3. ChatGPT-only development routes to `openai` developer execution.
4. Claude-only development routes to `anthropic` developer execution.
5. Gemini-only development routes to `google` developer execution.
6. Grok-only development routes to `xai` developer execution.
7. “Gemini만 실행 담당, 다른 AI는 검토만” still executes Gemini.
8. “Production에는 배포하지 마” blocks production deployment but not safe-branch development.
9. “4 AI 모두 작업하세요” selects all four developer providers.
10. Each provider uses its own `rc-work` branch.
11. No provider writes directly to `master`.
12. `/api/ai/chat` and `/api/ai/chat/stream` cannot disagree on execution routing.
13. `/api/dev/gemini` cannot bypass `/api/dev/agent`.
14. Tool Gateway GitHub writes reject missing Work ID or Provider metadata.
15. Tool Gateway GitHub writes use provider-scoped `rc-work` branches.
16. `rc-work/**` PR automation labels/titles work by actual provider rather than assuming Codex.
17. `/api/builder` requires explicit Codex specialist opt-in and cannot execute GitHub changes.
18. Lint/typecheck/tests/build remain green.
19. Vercel Preview is READY.
20. Production remains unchanged until approval.

## 8. Stable Baseline and Rollback
After smoke testing passes, mark the commit as a Stable Baseline. If Production later breaks a locked/core flow, stop unrelated development, identify the last Stable Baseline, prefer reverting the offending PR, reproduce and repair in Preview, and rerun the full smoke test.

## 9. Work-In-Progress Limit
Maximum active development: **1 ACTIVE code-change ticket** plus 1 BLOCKED/parked item.

An explicitly authorised multi-AI implementation of that one ACTIVE ticket may use multiple provider-isolated branches/PRs. This does not authorise a second unrelated active ticket.

## 10. Change Log Requirement
Every PR must contain Work Queue Ticket, Primary task, Batch exception, Goal, Files/components changed, Locked surfaces touched, Explicit non-goals, Verification plan, Automated test results, Preview status, manual smoke-test result where applicable, and Rollback point.

## 11. Automated Enforcement
Pull requests to `master` are subject to Royal Command Change Control, Conflict Guard, and Quality Gate. A failed gate means STOP and repair the active ticket before production merge.

## 12. Current Locked Command Room Surfaces
Unless the owner explicitly changes them:

- Native multiline composer layout and wrapping.
- Compact AI dock visual behavior.
- AI Warehouse placement/behavior.
- Conversation selector + SAVE/DELETE workflow.
- Conversation title editing workflow.
- Right work sidebar.
- No unsolicited external ChatGPT tab on Room entry.

This document is the default development authority for Royal Command UI and execution-control work.
