<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Royal Command Law — highest authority

Before Royal Command planning or executable development, read and follow `ROYAL_COMMAND_LAW.md`.

The Law is the highest Royal Command repository governance rule. If an older document, workflow, prompt or instruction conflicts with it, the Law controls and the lower-level rule must be updated.

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

Default interface language is English. Every system-owned button, menu, heading, placeholder, tooltip, accessible label, notice, validation message, and error must follow the customer's selected interface language through shared translation keys.

- English (`en` and regional variants): display English only; remove all secondary-language UI text immediately when switching to English.
- Any other selected language: display English together with that selected language, for example `Save · 저장` for Korean. Do not display unrelated third languages.
- Read the selected locale from the shared customer language setting; do not infer it from a message, microphone language, or country. If no selection or translation exists, use English; never display raw translation keys.
- Use shared locale resources and formatting, not hard-coded Korean or per-room language logic. APIs return stable error codes that the UI localizes; do not expose raw provider error text.
- Add only necessary guidance. Do not add obvious instructions such as “Press the microphone to speak.” Keep essential failure/recovery messages concise and retain accessible control labels.
- This rule governs system UI, not customer-authored room names, files, conversation history, or AI answer language. Preserve those contents. Keep brand names unchanged.
- For each affected UI, verify English-only, English + selected language, and switching back to English without stale secondary text. Ensure bilingual labels fit without hiding controls. Keep checks scoped to the change.

This is a coding requirement; recording it does not establish that existing screens have already been migrated.
