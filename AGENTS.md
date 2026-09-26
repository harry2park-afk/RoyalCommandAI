<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Royal Command Law — highest authority

Before Royal Command planning or executable development, read and follow `ROYAL_COMMAND_LAW.md`.

The Law is the highest Royal Command repository governance rule. If an older document, workflow, prompt or instruction conflicts with it, the Law controls and the lower-level rule must be updated.

Project reference: [RC 기억](RC_MEMORY.md) contains past decisions, existing code locations and work status for “RC 기억하고 시작해요”; it is reference material, not an additional rule or approval gate.

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

Follow Article 14 of `ROYAL_COMMAND_LAW.md`: one approval for a task title and its defined scope remains valid through completion, including necessary fixes, tests, commits, approved remote reflection and verification. Do not ask again because a tool changes, a step retries, a handoff occurs or a conversation resumes. Consume existing authorization at final gates. Ask only for a genuinely new boundary or binding external confirmation described in Article 14, explain the exact reason, and first prefer an authorized alternative. Do not extend the approved destination to Production or grant new account access implicitly.

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

## Self-service tool rooms — approved product design

For Room creation, tool catalog, tool installation, entitlement or removal work, follow [Self-service Tool Room Design](docs/rcv3/SELF_SERVICE_TOOL_ROOM_DESIGN.md). Customers assemble shared tools themselves; unpaid/expired tools remain in place and disabled until explicitly removed. Reuse existing components and enforce activation server-side. Installation, subscription cancellation and data deletion are separate. This is a scoped product requirement, not an extra approval gate; do not treat the design as implementation evidence.

## RC V3 customer platform and AI education

For V3 room, access, shortcut or education work, follow [RC V3 Platform and Learning Rules](docs/rcv3/PLATFORM_AND_AI_EDUCATION_RULES.md). Reuse the common frame; customers configure their own rooms. Education is free, 100 numbered topics over a recommended 30 days, increasingly practical after topic 050. Distinguish approved targets from implemented, verified features.

## RC V3 toolbox-first development — mandatory

For every new or changed V3 screen, room, button or executable feature, follow the toolbox-first section in [Self-service Tool Room Design](docs/rcv3/SELF_SERVICE_TOOL_ROOM_DESIGN.md). Inventory and reuse existing working controls and their real functionality. Register missing reusable functionality in the shared toolbox and verify it **before** consuming it in a screen or room. Do not implement duplicate per-room controls or defer toolbox registration. Reuse includes the UI, action, configuration schema, permissions, version and connection requirements; customer data, credentials and entitlements must not be copied. Report unregistered/unverified items explicitly. Documentation alone does not establish toolbox implementation or completion. This requirement adds no approval gate to unrelated work.


## RC toolbox ownership — 2026-09-22 correction

The shared toolbox is RC-managed and requires Harry’s authorization. Customers must not browse the toolbox or install tools directly. AI may prepare a scoped customer request; it cannot authorize or claim installation. Existing task approval is not blanket approval for unrelated customer installations. Server-side authorization is mandatory, independently of hidden UI controls. This correction overrides earlier customer self-service toolbox installation language. Customers may continue using and arranging their already supplied room features.

## RC outbound email — Owner instruction 2026-09-22

Only factual card-expiry/card-update reminders generated from verified current payment-provider records may be automatic. All other customer notices, including payment-success/failure notices, remain blocked pending Harry's explicit approval of the exact rendered message and recipient batch. Approval to develop this feature or finish the toolbox task is not approval to send customer emails. AI may draft, never authorize sending. Store approvals server-side; any change to content or recipients invalidates approval. Enforce this at the sending boundary, preserve an audit record, prevent duplicate sends, and never include full card numbers or CVV. Do not use Katie's personal Gmail connection as the RC system sender. Existing blanket automation plans are superseded by this instruction.

## RC V3 basic room and additional rooms — Owner instruction 2026-09-23

Follow [Basic Room Membership Rules](docs/rcv3/BASIC_ROOM_MEMBERSHIP_RULES.md). Signup creates the customer's basic room before member use. Existing-member Create Room creates additional rooms only and must verify the owned basic room server-side. Every non-basic room and the additional-room creation screen links directly to the customer's basic room as `← actual basic room name`. Every room provides an owned, actually created room list for direct room-to-room navigation; returning through the basic room is optional, never mandatory. Preserve existing rooms and customer data. This rule record is not evidence of runtime enforcement.
