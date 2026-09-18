# RCV3 isolated Preview integration

Internal validation candidate, not customer-ready certification. Existing fixed Preview alias, Production/master, Katie phone and existing rooms unchanged by this branch.

Includes authenticated Preview-only RCV3 rooms, owner-scoped cloud state/history/text files, revisioned design plus lifetime bindings, empty clones, configurable buttons/backgrounds, direct provider transport, waveform recording with silence-triggered transcription and spoken reply.

Preflight: 7 cloud schema/access tests and 13 independent core tests passed. Full Next build and typecheck passed before final voice lifecycle adjustments; final candidate verification recorded separately. Independent review found microphone mount binding, room-switch stale results, save races, playback feedback, scope switching and hidden-tab capture; corrected before internal deployment.

Existing RC live baseline: three Korean questions returned correct answers; second UI completion observation 2443ms. First/third polling observations are upper bounds, not precise timings. This is not an RCV3 speed improvement comparison.

Known acceptance limits: RCV3 records an utterance then transcribes after silence, not live word-by-word dictation. Physical user microphone/OS/browser acceptance and all provider tests remain required. Paid entitlements, mail/telephone execution and six commercial tier rules are not implemented by this candidate. API check performs synthetic TTS-to-STT roundtrip, explicitly not a physical microphone test. Cloud budget uses owner storage and is a Preview limit, not a tamper-proof paid billing ledger.
