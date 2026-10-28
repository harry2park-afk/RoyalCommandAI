# Original Katie call recordings

STANDARD; sole Writer Codex; independent review. Scope: incoming call mapping,
record merge, original-audio labels/errors. Owner explicitly requested original
customer/Katie audio, not Korean TTS. Preview only, no carrier or agent changes.

Evidence: Vercel Preview logs show call_ended/call_analyzed POST 422 with
retell_webhook_room_unresolved. Read-only DB query found 0 saved calls in the
verified Harry-owned Command Room 89fe50fc-12bf-4fa0-8da8-aff065bae960.

Incoming binding uses server env RETELL_INBOUND_ROOM_ID plus exact configured
RETELL_OWNER_REPORT_INBOUND_AGENT_ID and RETELL_OWNER_REPORT_FROM match. Only inbound
phone calls qualify; room existence is verified. This does not enable outbound calls.
Existing explicit metadata and service bindings remain available. Newest nonempty
recording and summary survive older ended events. UI plays original recording_url
using native audio controls and shows the original transcript; no translated voice.

Required remaining setup: set RETELL_INBOUND_ROOM_ID in Preview to the verified
room UUID above, then redeploy. No env mutation tool was available. The four related
values were previously added by Harry; their actual values are masked/unverified.
Do not enable outbound reporting flags for this in-room playback task.

Validation: 12 focused tests and typecheck passed. Real incoming test after env setup
must prove both call events save, original recording plays customer AND Katie, and
transcript corresponds. Playback and retention depend on Retell supplying a reachable
recording URL; no claim of permanent audio-file storage. Past failed events are not
backfilled automatically. No actual playback success claimed yet.
