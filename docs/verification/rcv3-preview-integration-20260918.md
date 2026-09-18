# RCV3 isolated Preview integration

Internal validation candidate, not customer-ready certification. Existing fixed Preview alias, Production/master, Katie phone and existing rooms unchanged by this branch.

Includes authenticated Preview-only RCV3 rooms, owner-scoped cloud state/history/text files, revisioned design plus lifetime bindings, empty clones, configurable buttons/backgrounds, direct provider transport, waveform recording with silence-triggered transcription and spoken reply.

Preflight: 7 cloud schema/access tests and 13 independent core tests passed. Full Next build and typecheck passed before final voice lifecycle adjustments; final candidate verification recorded separately. Independent review found microphone mount binding, room-switch stale results, save races, playback feedback, scope switching and hidden-tab capture; corrected before internal deployment.

Existing RC live baseline: three Korean questions returned correct answers; second UI completion observation 2443ms. First/third polling observations are upper bounds, not precise timings. This is not an RCV3 speed improvement comparison.

Known acceptance limits: RCV3 records an utterance then transcribes after silence, not live word-by-word dictation. Physical user microphone/OS/browser acceptance and all provider tests remain required. Paid entitlements, mail/telephone execution and six commercial tier rules are not implemented by this candidate. API check performs synthetic TTS-to-STT roundtrip, explicitly not a physical microphone test. Cloud budget uses owner storage and is a Preview limit, not a tamper-proof paid billing ledger.

## Live Preview verification

Initial commit 5a0d434e522fe98da88f1bb5d48f46f9bf08d8a4 deployed READY at dpl_HVpf6YWEnNrVyo5yyAAif7EN7Pkb through the existing Preview branch. Production/master unchanged. Final candidate Next build passed.

Authenticated owner created c8303f58-cacc-5b07-8b78-b67f9dacaca7. Actual ChatGPT returned 7+8=15 (server duration 2.93s). Connection check actual provider request 0.78s; generated Korean speech transcribed back successfully. Neither measure is a controlled speed comparison.

Changed Chat label to 내 AI and x=6, saved and reloaded: label and prior conversation persisted. Clone a6e3ec55-a6c6-534a-895c-99b424f522ce inherited the design and had empty conversation. Clone actual ChatGPT returned 9+6=15 (3.30s). Katie scope started empty and answered a personal secretary question (4.45s).

Cloud browser microphone start reported NotFoundError / 연결된 마이크를 찾을 수 없습니다. This execution browser has no available input device; a physical microphone-to-response test is NOT passed. Setup failure now clears continuous-mode state so one next click retries. Room switch clears stale check results; new typing during an in-flight reply is retained.
