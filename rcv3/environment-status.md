# Current status — deployed Preview, 2026-09-18

Authenticated GitHub connector committed RCV3 to the existing Preview branch; Vercel deployment reached READY. Real AI and Korean TTS/STT calls succeeded using the deployed server secret. Local terminal Vercel authentication remains unavailable and was not bypassed; supported connected apps removed it as a deployment blocker. No secret was extracted or displayed.

See docs/verification/rcv3-preview-integration-20260918.md for actual room IDs and evidence. Physical microphone testing is not passed: the cloud browser reported no input device. Paid tiers and external secretary execution are not implemented by this Preview.

## Historical observations (superseded where above differs)

# RCV3 environment evidence — 2026-09-18

Owner explicitly approved adding Development to the existing OPENAI_API_KEY scope.
Vercel project: royal-command-ai / prj_cJAYeuQdkm2FB2ZbEQc7YkRUUP6L.

Observed dashboard before change: OPENAI_API_KEY, Secret, Production and Preview.
After Save: All Environments; Updated just now; confirmation: "Updated Environment
Variable successfully. A new deployment is needed for changes to take effect."

No secret value was revealed, read, copied or replaced. Existing Production and
Preview selections remained selected. No Redeploy action was taken; no customer
room, telephone setting or deployment changed.

This establishes Vercel scope only. It does NOT establish a local credential,
successful provider request or working RCV3 voice. The terminal has no Vercel CLI
authentication/token and no OPENAI_API_KEY injected. Do not equate dashboard
success with end-to-end success. Next requirement is authorised development
execution using the configured secret without revealing its value.

## Durable access record and corrected blocker

User-facing record: RCV3-access-record.md, Library identity
libfile_f270bf251b8081919e48d57d4f359dec (contains metadata only, no secrets).
Existing Vercel token Royal Command AI Admin was found active, expiry 2027-08-12.
Its actual stored credential location is unknown; do not recreate it blindly.
ChatGPT Vercel connector project lookup succeeded without user login.
CLI 59.23.0 installed, but its login process was stopped by host policy:
`Network access to "https://api.vercel.com:443" was blocked by policy.`
Do not repeat user device-login requests before this execution restriction is
resolved. No available tool changes this Work session's host network policy.
Official cloud docs describe environment domain/method allowlists:
https://learn.chatgpt.com/docs/cloud/internet-access
Their UI applicability to this Work session is unverified. Authorised environment
operator action is required; no proxy workaround or new token solves this block.

## Latest ordered work / access recheck
Owner order: resolve development Vercel access first; then finish a reusable
microphone and a tool warehouse where verified tools can be selected for rooms.
Vercel connected-app get_project again succeeded for the recorded project/team;
latest inspected deployment dpl_DG3Seyk7BaWjWs8RqSpaYKKuiAxi remained READY.
This is connector read access, not terminal access or a working RCV3 deployment.
Current supplied executor allowlist still excludes api.vercel.com. No available
callable tool manages the executor's network policy. Repeated login was not run.
Official https://learn.chatgpt.com/docs/cloud/internet-access confirms domain and
HTTP-method rules are environment settings. Work-mode equivalent UI is unverified.
Required operator action: permit the approved executor's HTTPS access to
api.vercel.com and authentication to vercel.com, with needed GET/POST operations;
permit api.openai.com POST for the separately authorised actual AI/voice checks.
No policy modification, new token, deployment, or support message was performed.

After access succeeds: validate existing Development authentication without
printing keys, verify real transcription plus spoken/text response, mount one
shared microphone controller across routes, then expose only verified versions in
the tool warehouse. Per-room installation references a fixed tool/version and
copies appearance settings; never copies another customer's tokens or records.
Unverified tools cannot be marked usable. Browser permission remains necessary.
