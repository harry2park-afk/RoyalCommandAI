# Persistent answer speaker — Preview

Risk STANDARD; root sole writer; independent help_review reviewer found no blockers. Existing Owner authorization covers Preview implementation and synthetic voice verification. Production/master and Katie telephone settings unchanged. Rollback source: 4185e264b68273829ccfff79c79e1d5a324b015f.

RC V3 answer cards now keep each selected speaker ON until explicitly toggled OFF, independently from preparing/playing/idle/error status. The room-scoped boolean preference survives reload on the same browser. Live completion events alone trigger automatic reading, never restored chat history. A single queue serializes enabled providers; long answers use complete 3,500-character chunks. OFF aborts pending fetch, pauses active media and removes queued jobs for that provider. Microphone activation pauses playback without changing the preference.

AI Helper uses the same cancellable player directly. Removed global speechSynthesis monkeypatch mounting, forced ON during helper/mic opening, silent error fallback and 3,000-character truncation. The helper passes its room context to the existing authorized speech endpoint; no service gate is bypassed. Closed helper sessions cannot begin speech from late chat responses. Errors offer Retry audio without turning the preference OFF.

Audio element is reused and primed only by user clicks. Playback Promise failures are surfaced; no browser autoplay/security flags are changed. Chrome primary reference: https://developer.chrome.com/blog/autoplay . Physical Android output remains a handset acceptance check; cloud UI and automated Audio tests cannot establish that the owner's handset is audible.

Six targeted tests pass: complete chunks and sequential providers, pending-fetch OFF, active OFF and queue cancellation, late rejection isolation, playback failure/retry and persisted booleans/storage failure. Next.js production build passed. React review uses stable effect dependencies, scoped cleanup, accessible pressed state, no new dependency and no answer text stored in localStorage. Existing unrelated lint debt remains in Room/AIHelperChat.
