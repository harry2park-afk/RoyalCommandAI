import { RealtimeSecretaryVoiceSession } from "./realtime-voice-session";
import { SecretaryVoiceSession, type VoiceSessionOptions } from "./voice-session";

// A retry is initiated by the next microphone click, preserving the browser's
// audio user gesture. Never restart capture or replay a submitted order here.
export class SecretaryVoiceRecovery {
  private recorded = false;
  create(options: VoiceSessionOptions, onRecovery: () => string) {
    if (this.recorded) return new SecretaryVoiceSession({ ...options, autoDetectLanguage: true });
    return new RealtimeSecretaryVoiceSession({ ...options, onStop: message => {
      if (/\(VOICE_(PROVIDER_TIMEOUT|PROVIDER_UNAVAILABLE|CONNECTION|CHANNEL|CONNECT)\)$/.test(message)) {
        this.recorded = true;
        options.onStop(onRecovery());
      } else options.onStop(message);
    } });
  }
}
