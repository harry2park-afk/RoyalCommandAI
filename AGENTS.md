<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Royal Command Law — highest authority

Before any Royal Command planning, architecture change, executable development work, country rollout, provider integration, or production-affecting decision, read and follow `ROYAL_COMMAND_LAW.md`.

`ROYAL_COMMAND_LAW.md` is the highest Royal Command repository governance rule. If this file, any document, workflow, prompt, AI instruction, or implementation rule conflicts with it, the Rule Gate must block or escalate the conflict before executable work continues.

## Unified Rule Gate — mandatory before execution

Before executable work, evaluate all applicable rule sources through the Royal Command Rule Gate: Royal Command Law/internal policy, repository/platform rules, applicable country law/regulation, AI provider/API rules, customer/tenant restrictions, and Task resource/dependency boundaries.

The Rule Gate disposition must be one of: `ALLOW`, `ALLOW_WITH_CONDITIONS`, `OWNER_APPROVAL_REQUIRED`, `BLOCK`, or `UNKNOWN_REQUIRES_REVIEW`. `BLOCK` and unresolved `UNKNOWN_REQUIRES_REVIEW` prohibit execution on the affected scope.

## Royal Command AI execution isolation

Before any executable development work, read and follow `docs/AI_EXECUTION_ISOLATION_RULES.md`, except where an older rule conflicts with `ROYAL_COMMAND_LAW.md`; the Law controls and the conflicting lower rule must be updated.

Single Write Authority is per Task and per conflicting resource boundary, not global to the entire project. Multiple AIs may execute in parallel on explicitly isolated, non-overlapping Work Lanes, branches, files, country profiles or other resources. Each writable Task/resource boundary must have exactly one Writer/Executor at a time.

No concurrent modification of the same shared or locked resource is allowed. Shared/core changes must be serialized or explicitly handed off. An AI may take over a completed stage only after the prior Writer releases the resource and the handoff is recorded.

## Royal Command daily recovery

Read and follow `docs/DAILY_RECOVERY_RULES.md`.

The daily recovery review is persistent and must run at 23:30 Australia/Sydney without requiring a new user order. It must run even on days with no user work. No-change days verify the latest known-good restore point instead of creating unnecessary duplicate backups; material-change days create and verify a new restore point. Any uncertain, conflicting, destructive, insecure, or unrecoverable state must stop with an ERROR SIGNAL rather than being silently accepted.
