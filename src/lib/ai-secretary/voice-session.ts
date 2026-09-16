// One microphone stream per user-started session. Does not use Android's
// SpeechRecognition service (which can beep/restart at every short utterance).
export type VoiceSessionOptions = {
  language: string;
  onMessage: (text: string) => Promise<string>;
  onTranscript: (text: string) => void;
  onStatus: (text: string) => void;
  onStop: (text: string) => void;
};

export class SecretaryVoiceSession {
  private stopped = false;
  private stream?: MediaStream;
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private recorder?: MediaRecorder;
  private speech?: SpeechSynthesisUtterance;
  private request?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private poll?: ReturnType<typeof setInterval>;

  constructor(private options: VoiceSessionOptions) {}

  stop(message = "음성 대화를 종료했습니다.") {
    if (this.stopped) return;
    this.stopped = true;
    clearTimeout(this.timer);
    clearInterval(this.poll);
    this.request?.abort();
    if (this.recorder) {
      this.recorder.onstop = this.recorder.ondataavailable = this.recorder.onerror = null;
      if (this.recorder.state !== "inactive") this.recorder.stop();
    }
    this.stream?.getTracks().forEach(track => track.stop());
    if (this.context) void this.context.close().catch(() => {});
    if (this.speech) {
      this.speech.onend = this.speech.onerror = null;
      window.speechSynthesis.cancel();
    }
    this.options.onStop(message);
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined" ||
        typeof AudioContext === "undefined" || !("speechSynthesis" in window)) {
      this.stop("이 브라우저에서는 음성 대화를 사용할 수 없습니다. 최신 Chrome에서 열어 주세요.");
      return;
    }
    this.options.onStatus("마이크 연결 중… 사용 권한을 허용해 주세요.");
    this.timer = setTimeout(() => this.stop("마이크 연결 시간이 초과되었습니다. 권한을 확인한 뒤 다시 시작해 주세요."), 30000);
    try {
      this.context = new AudioContext();
      // Resume within the initiating user gesture, before awaiting permissions.
      const resumed = this.context.resume().then(() => true, () => false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      }});
      if (this.stopped) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const audioReady = await resumed;
      if (this.stopped) return;
      if (!audioReady) throw new Error("Audio context unavailable");
      clearTimeout(this.timer);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.context.createMediaStreamSource(stream).connect(this.analyser);
      stream.getAudioTracks().forEach(track => { track.onended = () => this.stop("마이크 연결이 끊겼습니다. 다시 시작해 주세요."); });
      this.listen();
    } catch {
      this.stop("마이크를 시작하지 못했습니다. 마이크 권한을 허용한 뒤 다시 시작해 주세요.");
    }
  }

  private listen() {
    if (this.stopped || !this.stream || !this.analyser) return;
    try {
      this.stream.getAudioTracks().forEach(track => { track.enabled = true; });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
      this.recorder = recorder;
      const chunks: Blob[] = [];
      let handling = false;
      let voiceMs = 0;
      let lastVoice = 0;
      const started = Date.now();
      let previous = started;
      const samples = new Float32Array(this.analyser.fftSize);
      recorder.ondataavailable = event => { if (!this.stopped && event.data.size) chunks.push(event.data); };
      recorder.onerror = () => this.stop("녹음에 실패했습니다. 마이크를 확인한 뒤 다시 시작해 주세요.");
      recorder.onstop = () => {
        if (this.stopped || handling) return;
        handling = true;
        clearInterval(this.poll);
        this.stream?.getAudioTracks().forEach(track => { track.enabled = false; });
        if (voiceMs < 160) { this.stop("말소리를 듣지 못했습니다. 마이크를 확인한 뒤 다시 시작해 주세요."); return; }
        const audio = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (!audio.size) { this.stop("녹음된 음성이 없습니다. 다시 시작해 주세요."); return; }
        void this.transcribe(audio);
      };
      recorder.start();
      this.options.onStatus("듣고 있습니다. 문장을 마친 뒤 잠시 쉬면 자동 전송합니다.");
      this.poll = setInterval(() => {
        if (this.stopped || recorder.state !== "recording") return;
        this.analyser!.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        const now = Date.now();
        if (rms >= 0.012) { voiceMs += Math.min(now - previous, 160); lastVoice = now; }
        previous = now;
        if ((voiceMs >= 160 && now - lastVoice >= 1800) || now - started >= 60000) recorder.stop();
        else if (voiceMs < 160 && now - started >= 30000) this.stop("말소리가 없어 음성 대화를 종료했습니다.");
      }, 80);
    } catch { this.stop("녹음을 시작하지 못했습니다. 다시 시작해 주세요."); }
  }

  private async transcribe(audio: Blob) {
    this.options.onStatus("말씀하신 내용을 받아쓰고 있습니다…");
    this.request = new AbortController();
    this.timer = setTimeout(() => this.request?.abort(), 45000);
    try {
      const form = new FormData();
      form.append("audio", audio, audio.type.includes("mp4") ? "katie-voice.m4a" : "katie-voice.webm");
      form.append("language", this.options.language.split("-")[0].toLowerCase());
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form, signal: this.request.signal });
      const result = await response.json();
      clearTimeout(this.timer);
      if (this.stopped) return;
      if (!response.ok) {
        this.stop(response.status === 401 ? "로그인이 만료되었습니다. 다시 로그인해 주세요." : "음성 받아쓰기에 실패했습니다. 잠시 후 다시 시작해 주세요.");
        return;
      }
      const text = typeof result.transcript === "string" ? result.transcript.trim() : "";
      if (!text) { this.stop("말씀을 인식하지 못했습니다. 마이크를 가까이하고 다시 시작해 주세요."); return; }
      this.options.onTranscript(text);
      if (/^(대화\s*종료|음성\s*(대화\s*)?(종료|중지)|stop( voice)?( conversation)?|end conversation)[.!?。\s]*$/i.test(text)) {
        this.stop(); return;
      }
      this.options.onStatus("Katie가 답변을 준비하고 있습니다…");
      const answer = await this.options.onMessage(text);
      if (this.stopped) return;
      if (!answer.trim()) { this.stop("답변을 받지 못했습니다. 다시 시작해 주세요."); return; }
      this.speak(answer);
    } catch { if (!this.stopped) this.stop("음성 요청에 실패했거나 시간이 초과되었습니다. 다시 시작해 주세요."); }
  }

  private speak(answer: string) {
    const speech = new SpeechSynthesisUtterance(answer);
    this.speech = speech;
    speech.lang = /[가-힣]/.test(answer) ? "ko-KR" : this.options.language;
    speech.onend = () => {
      if (this.stopped) return;
      this.speech = undefined;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.listen(), 500);
    };
    speech.onerror = () => this.stop("음성 재생에 실패했습니다. 화면의 답변을 확인해 주세요.");
    this.options.onStatus("Katie가 답변하고 있습니다…");
    this.timer = setTimeout(() => this.stop("음성 재생 시간이 초과되었습니다. 화면의 답변을 확인해 주세요."), 120000);
    window.speechSynthesis.speak(speech);
  }
}
