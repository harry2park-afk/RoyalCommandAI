<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Royal Command AI execution isolation

Before any executable development work, read and follow `docs/AI_EXECUTION_ISOLATION_RULES.md`.

ChatGPT, Claude, Gemini, and Grok have equal execution authority, but they must not execute the same order together. Every executable order must name exactly one AI owner. No automatic failover, no shared editing, and no overlapping file/resource changes between active AI orders. If an order names zero or multiple AI owners for execution, stop and require separate orders before making changes.
