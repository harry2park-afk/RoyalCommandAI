# RC toolbox / email approval Preview checkpoint

2026-09-22. Continuing Owner task approval covers this Preview branch only.

- Remote application commit: `6a5fcb6579df5e0f739dac73ecd2ce0795e3f791`; tree matches local tested tree `e0731cfb07f651973c822342c2c4e72954ee444a`.
- Vercel deployment `dpl_BnzEicdWpCj7qMhQPKA1XSfCAa7W` READY on exact application SHA. Production/master unchanged.
- 66 focused tests passed (65 combined plus added Update Card test); Next build, type checking, scoped lint and registry gate passed. Registry: 93 control definitions, 19 installable tools. Registration is not real-provider verification.
- Customer: request text only, approved existing tools, locked unpaid execution. RC owner: catalog/install, protected request review, email review. Protected server order grants filter paid-room installations even if a customer alters Storage directly.
- Existing saved Stripe customer is frozen before Checkout so lost responses do not create changing idempotency parameters. Card update opens billing portal even with an unpaid invoice. Payment remains sandbox-only.
- Email approval/storage tests pass; no email sent. Service and scheduler configuration and hosted UI flow remain outstanding; see `EMAIL_DELIVERY_STATUS.md`.

## Conflict Guard repair

The five remaining PR warnings were reviewed against actual code:
1. Three test fixture literals are data used by the scanner selftest.
2. CustomerAISecretary scrolls only its private `chatListRef` list, distinct from RoomV3's messages viewport (two warnings).
3. RoomPreferenceAuthority additions preserve the existing preference adapter and exclude nonlegacy warehouse state; no new compact dock owner.
4. HelpText listens for locale storage changes and resets its own text, without writing picker DOM/state.

The reviewed statement map is exact file + rule + added statement, not a file/directory exemption. Same-file unreviewed scroll, preference and locale statements still fail in regression tests. Strict scanner, large-diff streaming, path spoof checks and scanner-error failure remain enabled. No application component behavior changed to clear these lexical false positives.

HIGH-RISK work: root writer, two independent reviewer perspectives, scoped tests and external migration privilege read-back. Hosted browser backend did not return; no claim of real customer click-through or live delivery. Existing application account connections and customer records were not modified by tests.
