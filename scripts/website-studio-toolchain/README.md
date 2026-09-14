# Isolated Studio calculator toolchain

This fills the missing template/image-recipe files for the existing v2 runner. It does not provision an image, repository, database, Vercel project or account, and does not activate Studio.

`prepare.mjs NEW_DIRECTORY PINNED_BASE_IMAGE` exports the existing calculator into `template/public/`, creates a dependency-free static build and lockfile, creates a clean Git checkout on `studio-work/calculator`, and writes a Dockerfile with trusted build/test scripts in `/opt/studio`. An existing destination is rejected. The supplied base must be an actual reviewed, digest-pinned Sandbox-compatible image containing Node and Git. No image tag or synthetic digest is acceptable for deployment.

Build/publish the image through the approved registry and record the **returned image digest**, not the base digest, in the test project manifest. Import the exact complete `template` Git tree into the dedicated target repository. Verify the remote Git tree equals `manifest-public.json.templateTreeSha`. The model may edit only the three explicit public source paths. The Docker build context contains no remote URL, credentials or customer data.

`build.mjs` syntax-checks modules and copies fixed files to dist without installing dependencies or running generated scripts. `test.mjs` executes calculator code and must run only in the credential-free deny-all Sandbox when sources were model-generated. Local tests in this change executed the unchanged trusted repository fixture only. Static output and arithmetic tests are not browser acceptance or general framework support.

## Verification in this continuation

- Existing diagnostic run wrun_01M2FS1S3YHPQ3HF80X41X555R: actual status running; identity matched the zero-data connection workflow; cancelled and cancellation confirmed.
- Patched runtime deployment dpl_7Tnog5tTVnocnU31A9nhJHZaaRnc, commit ce2dec0b79c86689862360fe3384959336f76029: cloud run wrun_01M2G01YJDHYGGES73KJW2WF70 completed save/sleep/resume with expected result. Evidence: diagnostic commit ecf0c05535151b224a52b67fccde2b2e07624463, build logs in dpl_4c8pNfoMsiuhy6mfgZoPKNoYp2Jc. No AI, customer DB or publication in that workflow.
- Template preparation, trusted fixture build/test, exact output bytes, clean checkout, rejecting existing output directory and invalid module syntax passed locally. Recipe-only test used a synthetic digest; no cloud image was built or claimed.

## Remaining work by category

- Not implemented/provisioned: actual toolchain image build/publish; trusted registration/bootstrap into a dedicated DB; Studio v2 UI submission integration and final one-order E2E (only connect after isolated acceptance).
- Missing settings previously confirmed in controller Preview: VERCEL_TOKEN (test project/deployment metadata read), STUDIO_TEST_DATABASE_URL (dedicated private schema), STUDIO_ARTIFACT_ENCRYPTION_KEY (separate 32-byte key), STUDIO_TEST_AUTOMATION_BYPASS_SECRET (generated test project protection).
- Access/capability: current connectors list only RoyalCommandAI, royal-command-ai, and RoyalCommand Supabase. GitHub repository admin/push is available for the existing repository; repository creation is not an exposed connector operation. Vercel project/environment creation and Workflow administration are not exposed connector operations. CLI has no authenticated Vercel session. This does not prove the owner lacks permission.
- Isolation: dedicated test actor/tenant/Room, repository, generated-site Vercel project, database and secret isolation have not been attested. Never replace these with production credentials or the connected customer database.

Secrets belong in the trusted controller's branch-scoped Preview Secret environment variables only, not the generated site, model prompt, source, logs, workflow input/output or browser storage. Do not enable STUDIO_V2_ENABLED merely to bypass a readiness failure. Host-only supervisor startup/heartbeat and expiring isolation registration remain prerequisites.
