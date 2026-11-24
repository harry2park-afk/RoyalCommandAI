# V4 first-room return — 2026-11-24

Owner scope: Harry requested a visible button returning from all his rooms to Harrys room, including the V4-linked joint AI Preview. STANDARD; one Writer, independent Codex entry_country_review. Production/master, account/payment/phone and data changes excluded. Approval continues through Preview publication.

Reuse: room-list tool metadata, new shared V4HomeLink, rendered by IndependentAIRooms in the overview and each provider Open view. Canonical https://royalcommand.ai/v4/enter resolves the authenticated V4 first room; only five allowed language codes are sent. No fixed customer UUID, arbitrary next URL, credentials or membership flags. The Harry’s room caption is limited to this HARRY RC PREVIEW; it must not be promoted unchanged to a general customer app. Preview marker moves into the brand so it does not cover the new control. Header wraps on narrow displays. Existing provider requests, clipboard, history and six-panel grid remain.

Baseline b4f7814a339a91d505018c4fd3ed3dacbc64a0d2 (last code d0d9b4bc5154bf52f216a91a7defc9fa687ecf6e, READY dpl_DbxMr4hWN48m4uKBeA9etJon6jmb). Preview branch feat/independent-ai-rooms-v1-20260906 only.

Validation: typecheck, final production build, v4-home-link test 1/1 passed. Separate Codex independently ran the navigation test, reviewed diff, no code blocker. V4 reviewer also ran 20 first/additional/main/trial/language cases, wrong-account rejection and no-write checks. Browser and final deployment evidence to follow after native deployment. No live AI messages, payments or customer changes.

## Published result

App commit 53a2e05f9d157a3b92f6e780ee74de2cd0bdbe32; Vercel Preview dpl_Fr1GYyu1NFdNiK5sRxL4XyweBpLt, native READY, target:null. Existing Preview alias unchanged. Browser verified top-left Harry’s room link in overview and ChatGPT Open view, plus its /v4/enter?lang=en destination. Clicking reached V4 sign-in gate in this separate browser; authenticated first-room destination not visually verified. No messages submitted. Existing six cards and history remained visible.

Restore drill: {"sourceCommit": "53a2e05f9d157a3b92f6e780ee74de2cd0bdbe32", "filesCompared": 947, "sourceArchiveSha256": "afc37696ac69aad186d4f4925b71d61133388487b0494e6a2ecbe63566f3bbf7", "status": "passed", "scope": "tracked-source-and-bundled-assets-only", "excluded": ["live customer data", "browser uploads", "external service state"]}

Harry follow-up: no separate test entry, single AI joint room button in V4; top-left fixed return. Joint existing sticky header already meets overview and provider Open views. V4 review caught stale language in Add room return and fixed it;30 final cases passed. This source recovery is not a complete customer-data restore.
