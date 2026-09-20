<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Royal Command Law — highest authority

Before Royal Command planning or executable development, read and follow `ROYAL_COMMAND_LAW.md`.

The Law is the highest Royal Command repository governance rule. If an older document, workflow, prompt or instruction conflicts with it, the Law controls and the lower-level rule must be updated.

## RC project continuity — resume before rebuilding

For every Royal Command task, read `RC_MEMORY.md` first after the Law, then only the relevant entry in `docs/continuity/FEATURE_MAP.md`. The Owner's phrases “RC 기억하고 시작해요”, “RC 기억”, and “RC 이어서” mean resume this project from these records. This applies even if a new conversation does not contain the old transcript.

- Check the actual branch, worktree, remote HEAD and relevant existing code/history before changing anything. Reuse or repair existing modules; do not rebuild because previous chat context is missing. Follow the existing RC-CORE registry/clone policy.
- Keep implementation, live verification, historical reports and unresolved dependencies distinct. Current evidence and current Owner instructions override stale summaries. Memory does not grant new permissions or change Production restrictions.
- After material work, update the compact current state, affected feature-map entry and session checkpoint, and save them on the authorized branch. Preserve prior decisions; mark superseded ones with their replacement. Do not create recursive documentation commits merely to record their own SHA.
- Store project decisions and evidence references only, never credentials or customer mail/call/document contents. If the repository or a referenced source is unavailable, disclose that limitation rather than inventing remembered work.

## Risk-proportional execution — speed is a requirement

Classify work as `FAST`, `STANDARD`, or `HIGH-RISK` before choosing process depth.

- `FAST`: one Writer when needed + minimum relevant automated checks. Do not automatically invoke all AIs, full Rule Gate or repository cross-review.
- `STANDARD`: one Writer per conflicting resource + one independent Reviewer + relevant lint/typecheck/tests/build.
- `HIGH-RISK`: full relevant Rule Gate + repository-grounded evidence + at least two independent review perspectives when practical. Use Codex for code/security review when an actual Codex connector is available; otherwise record `CODEX_UNAVAILABLE` and continue with available reviewers.

Adding gates or reviewers without a concrete risk reason is prohibited because unnecessary process is a performance defect.

## Visible controls must work before completion

A visible button, menu item, switch, shortcut, link-like control, or other interactive control is not complete merely because it renders. Before the related task is declared complete, verify its real action path through the handler, API or state change, expected success result, and relevant failure state. Do not knowingly ship decorative or non-functional controls for later repair unless the Owner explicitly asks for a placeholder.

For a changed interactive control, test the narrowest real end-to-end path that proves the control performs its intended action. Keep this verification risk-proportionate so it does not slow unrelated work.

## Parallel Work Lanes / Single Write Authority

Single Write Authority is per Task and conflicting resource boundary, not global to the project. Independent non-overlapping Work Lanes may run in parallel. Shared/core resources must be serialized or explicitly handed off.

## Evidence and Host authority

No AI self-report proves execution. File changes, tests, commits and deployments require Host-verifiable evidence. Provider AIs must not receive unrestricted infrastructure credentials or arbitrary mutation authority.

## Owner approval continuity

If the Owner explicitly grants continuing approval for a defined project phase or sequence, do not repeatedly ask for approval inside that scope unless the action becomes destructive, materially expands scope, exposes a new high-severity unknown, requires a credential/value only the Owner can supply, or binding external rules require separate confirmation.

## Royal Command daily recovery

Read and follow `docs/DAILY_RECOVERY_RULES.md` except where it conflicts with `ROYAL_COMMAND_LAW.md`.

The daily recovery review is persistent and must run at 23:30 Australia/Sydney without requiring a new user order. No-change days verify the latest known-good restore point instead of creating unnecessary duplicate backups; material-change days create and verify a new restore point. Any uncertain, conflicting, destructive, insecure, or unrecoverable state must stop with an ERROR SIGNAL rather than being silently accepted.


## Customer interface language — required for new and modified code

Default interface language is English. Keep most UI in simple English. Use shared translation keys to add the selected language only where needed for understanding.

- English (`en` and regional variants): display English only; remove all secondary-language UI text immediately when switching to English.
- Simple, familiar labels remain English-only regardless of selected language: Save, Cancel, Close, Edit, Send, Files, My Rooms, Create Room, AI List. Do not automatically add translations to every button or menu.
- For non-English selections, add English + the selected language only to necessary explanations, errors, permissions, or unfamiliar actions whose meaning would otherwise be unclear. Do not add unrelated third languages or extra guidance merely to provide a translation.
- Read the selected locale from the shared customer language setting; do not infer it from a message, microphone language, or country. If no selection or translation exists, use English; never display raw translation keys.
- Use shared locale resources and formatting, not hard-coded Korean or per-room language logic. APIs return stable error codes that the UI localizes; do not expose raw provider error text.
- Add only necessary guidance. Do not add obvious instructions such as “Press the microphone to speak.” Keep essential failure/recovery messages concise and retain accessible control labels.
- This rule governs system UI, not customer-authored room names, files, conversation history, or AI answer language. Preserve those contents. Keep brand names unchanged.
- For each affected UI, verify that simple labels remain English-only, necessary explanatory messages follow the selected language, and switching back to English removes secondary text. Ensure any bilingual text fits without hiding controls. Keep checks scoped to the change.

This is a coding requirement; recording it does not establish that existing screens have already been migrated.
