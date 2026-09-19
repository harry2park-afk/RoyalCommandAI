import type { VoiceSessionOptions } from "./voice-session";

// Stream microphone audio immediately; transcript deltas do not wait for silence.
export class RealtimeSecretaryVoiceSession {
  private stopped = false;
  private ready = false;
  private accepting = false;
  private item = "";
  private partial = "";
  private completed = new Set<string>();
  private stream?: MediaStream;
  private peer?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private request = new AbortController();
  private timer?: ReturnType<typeof setTimeout>;
  private speech?: SpeechSynthesisUtterance;

  constructor(private options: VoiceSessionOptions) {}

  private deadline(ms: number, message: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.stop(message), ms);
  }

  private mute(muted: boolean) {
    this.stream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
  }

  stop(message = "음성 대화를 종료했습니다.") {
    if (this.stopped) return;
    this.stopped = true;
    clearTimeout(this.timer);
    this.request.abort();
    this.stream?.getTracks().forEach(track => track.stop());
    this.channel?.close();
    this.peer?.close();
    if (this.speech) {
      this.speech.onend = this.speech.onerror = null;
      window.speechSynthesis.cancel();
    }
    this.options.onLevel?.(0);
    this.options.onStop(message);
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined" || !("speechSynthesis" in window)) {
      this.stop("이 브라우저에서는 음성 대화를 사용할 수 없습니다. Chrome에서 열어 주세요."); return;
    }
    this.options.onPhase?.("connecting");
    this.options.onStatus("실시간 음성 연결 중…");
    this.deadline(30000, "실시간 음성 연결 시간이 초과됐습니다. (VOICE_CONNECT)");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (this.stopped) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.mute(true);
      const peer = new RTCPeerConnection();
      this.peer = peer;
      stream.getAudioTracks().forEach(track => {
        track.onended = () => this.stop("마이크 연결이 끊겼습니다. (VOICE_DEVICE)");
        peer.addTrack(track, stream);
      });
      peer.onconnectionstatechange = () => {
        if (!this.stopped && ["failed", "disconnected", "closed"].includes(peer.connectionState)) this.stop("실시간 음성 연결이 끊겼습니다. (VOICE_CONNECTION)");
      };
      const channel = peer.createDataChannel("oai-events");
      this.channel = channel;
      channel.onopen = () => {
        if (this.stopped) return;
        channel.send(JSON.stringify({ type: "session.update", session: { type: "transcription", audio: { input: {
          noise_reduction: { type: "near_field" },
          turn_detection: { type: "server_vad", threshold: 0.45, prefix_padding_ms: 300, silence_duration_ms: 1800 },
        } } } }));
      };
      channel.onmessage = event => { if (!this.stopped) this.receive(String(event.data)); };
      channel.onerror = () => this.stop("실시간 음성 통신에 실패했습니다. (VOICE_CHANNEL)");
      channel.onclose = () => { if (!this.stopped) this.stop("실시간 음성 연결이 종료됐습니다. (VOICE_CHANNEL)"); };
      const offer = await peer.createOffer();
      if (this.stopped) return;
      await peer.setLocalDescription(offer);
      if (this.stopped) return;
      const language = this.options.language.toLowerCase().startsWith("zh-") ? this.options.language.toLowerCase() : this.options.language.split("-")[0].toLowerCase();
      const response = this.options.negotiate ? await this.options.negotiate(offer.sdp || "", this.request.signal) : await fetch(`/api/voice/realtime-session?lang=${encodeURIComponent(language)}`, {
        method: "POST", headers: { "Content-Type": "application/sdp" }, body: offer.sdp,
        signal: this.request.signal,
      });
      const answer = await response.text();
      if (this.stopped) return;
      if (!response.ok || !answer.startsWith("v=0")) {
        let code = "";
        try { const error = JSON.parse(answer); if (typeof error.code === "string") code = error.code; } catch {}
        const messages: Record<string, string> = {
          VOICE_AUTH: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
          VOICE_AUTH_TIMEOUT: "로그인 확인 서버가 응답하지 않습니다. (VOICE_AUTH_TIMEOUT)",
          VOICE_SDP_TIMEOUT: "음성 연결 정보가 서버에 전달되지 않았습니다. (VOICE_SDP_TIMEOUT)",
          VOICE_CONFIG: "음성 서버 연결 설정이 없습니다. (VOICE_CONFIG)",
          VOICE_PROVIDER_TIMEOUT: "외부 음성 서버가 응답하지 않습니다. (VOICE_PROVIDER_TIMEOUT)",
          VOICE_PROVIDER_AUTH: "음성 서비스 인증을 확인해야 합니다. (VOICE_PROVIDER_AUTH)",
          VOICE_PROVIDER_LIMIT: "음성 서비스 사용 한도에 도달했습니다. (VOICE_PROVIDER_LIMIT)",
          VOICE_PROVIDER_REQUEST: "음성 서버가 연결 설정을 거절했습니다. (VOICE_PROVIDER_REQUEST)",
          VOICE_PROVIDER_UNAVAILABLE: "음성 서비스가 일시적으로 응답하지 않습니다. (VOICE_PROVIDER_UNAVAILABLE)",
        };
        this.stop(messages[code] || (response.status === 401 ? messages.VOICE_AUTH : `실시간 음성 서버에 연결하지 못했습니다. (VOICE_CONNECT_${response.status})`)); return;
      }
      await peer.setRemoteDescription({ type: "answer", sdp: answer });
    } catch { if (!this.stopped) this.stop("마이크 또는 실시간 음성 연결을 시작하지 못했습니다. (VOICE_CONNECT)"); }
  }

  private listen() {
    if (this.stopped) return;
    this.item = ""; this.partial = ""; this.accepting = true;
    this.options.onTranscript("");
    this.mute(false);
    this.options.onPhase?.("listening");
    this.options.onStatus("듣고 있습니다…");
    this.deadline(45000, "음성 인식 결과를 받지 못했습니다. (VOICE_NO_TRANSCRIPT)");
  }

  private receive(raw: string) {
    let event: { type?: string; item_id?: string; delta?: string; transcript?: string };
    try { event = JSON.parse(raw); } catch { return; }
    if (event.type === "error" || event.type === "conversation.item.input_audio_transcription.failed") {
      this.stop("실시간 받아쓰기에 실패했습니다. (VOICE_TRANSCRIPTION)"); return;
    }
    if (event.type === "session.updated" && !this.ready) { this.ready = true; this.listen(); return; }
    const id = event.item_id;
    if (!this.ready || !id || this.completed.has(id)) return;
    if (!this.item && this.accepting) this.item = id;
    if (id !== this.item) return;
    if (event.type === "input_audio_buffer.speech_started" && this.accepting) {
      this.options.onLevel?.(1);
    } else if (event.type === "input_audio_buffer.speech_stopped" && this.accepting) {
      this.accepting = false;
      this.mute(true);
      this.options.onLevel?.(0);
      this.options.onPhase?.("transcribing");
      this.deadline(20000, "문장 확정이 지연되고 있습니다. (VOICE_FINAL_TIMEOUT)");
    } else if (event.type === "conversation.item.input_audio_transcription.delta") {
      this.partial += typeof event.delta === "string" ? event.delta : "";
      this.options.onTranscript(this.partial);
      // A continuing utterance can exceed the idle deadline; no local RMS gate.
      if (this.accepting) this.deadline(45000, "음성 인식 결과가 중단됐습니다. (VOICE_NO_TRANSCRIPT)");
    } else if (event.type === "conversation.item.input_audio_transcription.completed") {
      this.completed.add(id);
      this.accepting = false; this.mute(true); clearTimeout(this.timer);
      const text = typeof event.transcript === "string" ? event.transcript.trim() : "";
      if (!text) { this.stop("말씀을 인식하지 못했습니다. (VOICE_EMPTY)"); return; }
      this.options.onTranscript(text);
      if (/^(대화\s*종료|음성\s*(대화\s*)?(종료|중지)|stop( voice)?( conversation)?|end conversation)[.!?。\s]*$/i.test(text)) { this.stop(); return; }
      void this.answer(text);
    }
  }

  private async answer(text: string) {
    this.options.onPhase?.("thinking");
    this.options.onStatus(`${this.options.speakerLabel || "Katie"} · 답변 준비 중…`);
    this.deadline(this.options.answerTimeoutMs || 50000, "답변 시간이 초과됐습니다. (VOICE_ANSWER_TIMEOUT)");
    try {
      const answer = await this.options.onMessage(text);
      if (this.stopped) return;
      if (!answer.trim()) { this.stop("답변을 받지 못했습니다. (VOICE_ANSWER)"); return; }
      const speech = new SpeechSynthesisUtterance(answer);
      this.speech = speech;
      speech.lang = /[가-힣]/.test(answer) ? "ko-KR" : this.options.language;
      speech.onend = () => {
        if (this.stopped) return;
        this.speech = undefined;
        clearTimeout(this.timer);
        try {
          if (this.channel?.readyState !== "open") throw new Error("channel closed");
          this.channel.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
        } catch { this.stop("실시간 음성 연결이 종료됐습니다. (VOICE_CHANNEL)"); return; }
        this.timer = setTimeout(() => this.listen(), 500);
      };
      speech.onerror = () => this.stop("음성 재생에 실패했습니다. 화면의 답변을 확인해 주세요.");
      this.options.onPhase?.("speaking");
      this.options.onStatus(`${this.options.speakerLabel || "Katie"} · 음성 재생 중…`);
      this.deadline(120000, "음성 재생 시간이 초과됐습니다.");
      window.speechSynthesis.speak(speech);
    } catch { if (!this.stopped) this.stop("답변 요청에 실패했습니다. 화면을 확인해 주세요."); }
  }
}
