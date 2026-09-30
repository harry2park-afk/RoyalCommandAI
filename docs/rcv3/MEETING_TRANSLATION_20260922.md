# Meeting translation — Preview

STANDARD. Writer: root. Reviewer: review_meeting. Owner authorized implementation; only PR748 Preview. No Production/master or customer records modified except existing account usage reservation when the user requests translation.

Integrated panel: Translation On/Off, My Language, Other Person's Language, incoming Text Only or Voice + Text. Outgoing is always translated voice only; no outgoing captions and no original-audio fallback. Existing owned RC room entitlement and account quota apply. Input is ephemeral; no transcript persistence. OpenAI STT, existing translation adapter and TTS reused; provider key remains server side. Microphone requests only on explicit action, max20 seconds /2MB; cancellation stops tracks and ignores late events. Text input supports microphone-unavailable environments. Playback is explicit through audio controls to avoid microphone feedback.

Scope: local translation preview, not a conference. No remote audio transport, remote speech reception or live translated-only transmission is implemented. Before live launch, connect a conference provider and publish ONLY synthesized audio on the outgoing track; never publish raw microphone or subtitle data. Incoming source audio must use selected participant language and output mode. Do not claim live meeting translation from local tests.

Validation:8 route tests cover outgoing translated-audio-only, incoming modes, room authorization, paid capability/quota, origin/language rejection, speech failure and selected transcription source. Physical microphone, remote transport, real speaker audio perception remain unverified. Typecheck and Preview browser validation recorded in task report.
