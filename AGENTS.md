<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Royal Command AI execution isolation

Before any executable development work, read and follow `docs/AI_EXECUTION_ISOLATION_RULES.md`.

ChatGPT, Claude, Gemini, and Grok have equal execution authority, but they must not execute the same order together. Every executable order must name exactly one AI owner. No automatic failover, no shared editing, and no overlapping file/resource changes between active AI orders. If an order names zero or multiple AI owners for execution, stop and require separate orders before making changes.

## Royal Command daily recovery

Read and follow `docs/DAILY_RECOVERY_RULES.md`.

The daily recovery review is persistent and must run at 23:30 Australia/Sydney without requiring a new user order. It must run even on days with no user work. No-change days verify the latest known-good restore point instead of creating unnecessary duplicate backups; material-change days create and verify a new restore point. Any uncertain, conflicting, destructive, insecure, or unrecoverable state must stop with an ERROR SIGNAL rather than being silently accepted.
