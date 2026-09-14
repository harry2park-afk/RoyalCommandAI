# Website Studio runtime continuation

Base: 74383702c031adef72680594d5ebee2a239cb522. Additive, disabled Preview-only implementation. Existing Studio UI is deliberately not switched until the isolated one-order acceptance passes. Production/master and existing Room, conversation, Memory, customer records are not migrated or edited.

## Implemented

- Real Astra/Codex connector adapters, Codex-only file proposal, pinned clean Git template in an isolated Vercel Sandbox, full-tree diff identity and tested-byte publication.
- Durable Workflow steps, persisted job ownership/deadlines, transactional outbox, supervisor heartbeat/reconciliation, repository/branch fences and expected-head publication. Unknown publication retains its lock; no blind mutation retry.
- Scoped encrypted artifacts in a separate PostgreSQL database. Schema script remains unapplied. Dedicated test project registration requires expiring isolation evidence, static generated deployment and secret-isolation attestations. These assertions must be independently verified before registration; a Boolean is not proof.
- Authenticated, disabled job intake/status API. No public supervisor bootstrap route. Trusted operator starts `startStudioSupervisor` only after isolated database setup; intake requires its recent heartbeat.
- Same-SHA Vercel metadata checks and host-owned calculator browser assertions. Official protection-bypass header is injected in server-side intercepted fetches only; redirects, off-origin requests, writes and WebSockets are rejected. RC account authentication is separate.
- No-change proposals require functional verification of the existing SHA. Design-only/unsupported remain distinct outcomes. Existing records retain optional-field compatibility. Common Core and EN/KO locale behavior are shared.

## Actual connection evidence

Probe commit a09ccfdb58e60189d9c750785c5c0d41bd6d5742; deployment dpl_21wcVH1XooqmdpX9UZofR1PKqu8U, READY. Its build performed fixed zero-customer-data health checks:

- Astra gpt-6-astra: HTTP 200 response received.
- Codex gpt-5.3-codex: HTTP 200 response received.
- Sandbox: blank deny-all image command exit 0, stop/delete completed.
- Existing official VERCEL_AUTOMATION_BYPASS_SECRET present; server-side x-vercel-protection-bypass request changed the earlier Vercel SSO 302 into RC canonical Preview 308. This is NOT RC login or browser functionality success. No personal JWT or protection changes used.

Local real Workflow engine test passed save/wait/reopen/resume. Cloud Workflow health probe is supplied separately and targets an explicit immutable deployment; its result must be reported separately from the local engine result. Provider unit tests use mocks and do not establish one-order integration success.

## Remaining acceptance gates

1. Separate test repository and linked static Vercel test project, with no inherited customer/build credentials. Current controller repository ID 1314345897 is denied as a generation target.
2. Dedicated test RC actor/tenant/Room identity, no customer records; expiring reviewed manifest in the isolated private store.
3. Separate PostgreSQL connection STUDIO_TEST_DATABASE_URL and 32-byte base64 STUDIO_ARTIFACT_ENCRYPTION_KEY. Apply scripts/website-studio-private-store.sql only to that verified database. Current connected RoyalCommand database has no studio_execution_private schema; no DDL was applied.
4. Immutable Sandbox image digest containing exactly the approved Git template tree, build/test scripts and offline dependencies, no credentials. Blank-image connectivity is not evidence this template exists.
5. Controller Preview VERCEL_TOKEN with read access to the test project's deployment/project metadata, control project/team IDs, and STUDIO_TEST_AUTOMATION_BYPASS_SECRET for the generated test project. Determine actual missing values from the safe readiness flags; never copy secrets into reports, orders, logs or generated code.
6. Start supervisor, confirm heartbeat, then enable STUDIO_V2_ENABLED only in the approved controller Preview. Submit one test order; verify source build/test, conditional branch commit, exact deployment SHA and actual browser behavior. Connect the existing Studio only after all pass.

The readiness/probe scripts are exact-Preview-branch gated. The normal runtime never invokes these scripts. The zero-data cloud health workflow does not touch customer data, models or GitHub.

## Rollback

No database migration or feature enablement has occurred. Leave runtime disabled and existing UI unchanged. If later enabled, stop intake and supervisor, preserve uncertain publication locks/evidence, then disable the Preview-only feature. Revert only the dedicated work branch after recording any test publication receipt; do not reset master or delete customer data. Never automatically revert an unknown remote publication.

## Cloud verification correction

First real cloud run wrun_01M2FS1S3YHPQ3HF80X41X555R targeted deployment dpl_3hKXqiDj2TXRxCMvXH6oYF8oyEXZ (f84932d). Flow delivery returned 200, but step returned 500: `Cannot find module '/var/task/node_modules/playwright-core/browsers.json'`. This is a packaging failure, not a protection-authentication failure. The follow-up includes Chromium/Playwright files in the generated Workflow step and v2 intake trace. Local rebuilt step NFT confirms browsers.json and 15 Chromium files. The diagnostic uses bounded status polling and cancels its own unfinished run; it does not leave an unbounded return-value poll after timeout.

Actual f84932d Preview build readiness: OPENAI_API_KEY, GITHUB_TOKEN, VERCEL_OIDC_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID and VERCEL_AUTOMATION_BYPASS_SECRET present. VERCEL_TOKEN, STUDIO_TEST_DATABASE_URL, STUDIO_ARTIFACT_ENCRYPTION_KEY, STUDIO_TEST_AUTOMATION_BYPASS_SECRET and STUDIO_V2_ENABLED absent. Values were neither printed nor copied. The first four absent settings block the isolated full-flow acceptance; the feature flag must stay absent until isolation and bootstrap are verified.
