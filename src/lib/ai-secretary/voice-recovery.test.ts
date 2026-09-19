import { describe, expect, it, vi } from "vitest";
import type { VoiceSessionOptions } from "./voice-session";
vi.mock("./realtime-voice-session", () => ({ RealtimeSecretaryVoiceSession: class {
  mode = "live";
  constructor(public options: VoiceSessionOptions) {}
  start = vi.fn();
  stop(message: string) { this.options.onStop(message); }
} }));
vi.mock("./voice-session", () => ({ SecretaryVoiceSession: class {
  mode = "recorded";
  constructor(public options: VoiceSessionOptions) {}
  start = vi.fn();
} }));
import { SecretaryVoiceRecovery } from "./voice-recovery";
import { katieVoiceText } from "../locale/katie-voice";

function options() {
  return { language: "ko-KR", onMessage: vi.fn(async () => "answer"), onTranscript: vi.fn(), onStatus: vi.fn(), onStop: vi.fn() };
}
describe("Katie voice recovery", () => {
  it("waits for another click after timeout, then uses recorded voice without forcing a language", () => {
    const recovery = new SecretaryVoiceRecovery();
    const opts = options();
    const first = recovery.create(opts, () => "retry microphone");
    first.stop("외부 음성 서버가 응답하지 않습니다. (VOICE_PROVIDER_TIMEOUT)");
    expect(opts.onStop).toHaveBeenCalledWith("retry microphone");
    expect(first.start).not.toHaveBeenCalled();
    expect(opts.onMessage).not.toHaveBeenCalled();
    const next = recovery.create(opts, () => "retry microphone");
    expect(next).toMatchObject({ mode: "recorded", options: { autoDetectLanguage: true } });
    expect(next.start).not.toHaveBeenCalled();
  });
  it.each(["VOICE_AUTH", "VOICE_CONFIG", "VOICE_PROVIDER_AUTH", "VOICE_PROVIDER_LIMIT", "VOICE_ANSWER_TIMEOUT"])("does not mask %s or retry an order", code => {
    const recovery = new SecretaryVoiceRecovery();
    const opts = options();
    recovery.create(opts, () => "retry microphone").stop(`error (${code})`);
    expect(opts.onStop).toHaveBeenCalledWith(`error (${code})`);
    expect(recovery.create(opts, () => "retry microphone")).toMatchObject({ mode: "live" });
  });
  it("leaves normal stop in live mode and resets recovery for a new room/component", () => {
    const recovery = new SecretaryVoiceRecovery();
    recovery.create(options(), () => "retry").stop();
    expect(recovery.create(options(), () => "retry")).toMatchObject({ mode: "live" });
    expect(new SecretaryVoiceRecovery().create(options(), () => "retry")).toMatchObject({ mode: "live" });
  });
  it("uses shared UI language and removes Korean on switching to English", () => {
    expect(katieVoiceText("recovery", "ko-KR")).toContain("마이크");
    expect(katieVoiceText("recovery", "en-AU")).not.toMatch(/[가-힣]/);
    expect(katieVoiceText("recovery", "fr")).not.toMatch(/[가-힣]/);
  });
});
