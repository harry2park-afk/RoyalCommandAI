import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretaryVoiceSession } from '@/lib/ai-secretary/voice-session';

let level: number;
let spoken: Speech[];
let sessions: SecretaryVoiceSession[];
let track: { enabled: boolean; stop: ReturnType<typeof vi.fn> };
let getUserMedia: ReturnType<typeof vi.fn>;
let request: ReturnType<typeof vi.fn>;
class Recorder {
  static instances: Recorder[] = [];
  static isTypeSupported = () => true;
  state = 'inactive'; mimeType = 'audio/webm;codecs=opus';
  ondataavailable?: (e: {data: Blob}) => void;
  onstop?: () => void; onerror?: () => void;
  constructor() { Recorder.instances.push(this); }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.ondataavailable?.({data: new Blob(['audio-test'])}); this.onstop?.(); }
}
class Context {
  resume = async () => {};
  close = vi.fn(async () => {});
  createAnalyser = () => ({fftSize: 2048, getFloatTimeDomainData: (buffer: Float32Array) => buffer.fill(level)});
  createMediaStreamSource = () => ({connect: vi.fn()});
}
class Speech { onend?: () => void; onerror?: () => void; constructor(public text: string) {} }
function make(language: 'ko-KR' | 'en-AU' = 'ko-KR', onMessage = vi.fn(async () => '답변입니다.')) {
  const options = { language, onMessage, onTranscript: vi.fn(), onStatus: vi.fn(), onStop: vi.fn() };
  const session = new SecretaryVoiceSession(options); sessions.push(session);
  return {session, options};
}
async function phrase() {
  level = 0.04; await vi.advanceTimersByTimeAsync(800);
  level = 0; await vi.advanceTimersByTimeAsync(1900);
}
beforeEach(() => {
  vi.useFakeTimers(); level = 0; sessions = []; spoken = []; Recorder.instances = [];
  track = {enabled: true, stop: vi.fn()};
  getUserMedia = vi.fn(async () => ({getTracks: () => [track], getAudioTracks: () => [track]}));
  request = vi.fn(async () => new Response(JSON.stringify({transcript: '오늘 할 일을 알려주세요'}), {status: 200}));
  vi.stubGlobal('navigator', {mediaDevices: {getUserMedia}});
  vi.stubGlobal('MediaRecorder', Recorder); vi.stubGlobal('AudioContext', Context);
  vi.stubGlobal('window', {speechSynthesis: {speak: (s: Speech) => spoken.push(s), cancel: vi.fn()}});
  vi.stubGlobal('SpeechSynthesisUtterance', Speech); vi.stubGlobal('fetch', request);
});
afterEach(() => { sessions.forEach(s => s.stop()); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('Katie recorder sessions (simulated microphone/STT)', () => {
  it('allows automatic language recognition for the recovery path', async () => {
    const opts = {language:'en-AU', autoDetectLanguage:true, onMessage:vi.fn(async()=> '답변'), onTranscript:vi.fn(), onStatus:vi.fn(), onStop:vi.fn()};
    const session = new SecretaryVoiceSession(opts); sessions.push(session);
    await session.start(); await phrase();
    expect((request.mock.calls[0][1].body as FormData).has('language')).toBe(false);
    expect(opts.onMessage).toHaveBeenCalledOnce();
  });
  it('stops after a stalled answer without resubmitting the order or speaking a late response', async () => {
    let resolve!: (value:string)=>void;
    const onMessage = vi.fn(()=>new Promise<string>(r=>{resolve=r;}));
    const {session,options}=make('ko-KR',onMessage);
    await session.start(); await phrase();
    await vi.advanceTimersByTimeAsync(50000);
    expect(options.onStop).toHaveBeenCalledWith(expect.stringContaining('VOICE_ANSWER_TIMEOUT'));
    resolve('late'); await vi.advanceTimersByTimeAsync(0);
    expect(onMessage).toHaveBeenCalledOnce(); expect(spoken).toHaveLength(0);
    expect(track.stop).toHaveBeenCalledOnce();
  });
  it('opens no microphone until explicitly started', () => { make(); expect(getUserMedia).not.toHaveBeenCalled(); });
  it('keeps the whole utterance through a short pause and explicitly requests Korean', async () => {
    const {session, options} = make(); await session.start();
    level = .04; await vi.advanceTimersByTimeAsync(800);
    level = 0; await vi.advanceTimersByTimeAsync(900);
    expect(request).not.toHaveBeenCalled();
    level = .04; await vi.advanceTimersByTimeAsync(800);
    level = 0; await vi.advanceTimersByTimeAsync(1900);
    expect(request).toHaveBeenCalledTimes(1);
    const [url, init] = request.mock.calls[0];
    expect(url).toBe('/api/voice/transcribe'); expect(init.body.get('language')).toBe('ko');
    expect(init.body.get('audio').name).toBe('katie-voice.webm');
    expect(options.onMessage).toHaveBeenCalledExactlyOnceWith('오늘 할 일을 알려주세요');
    expect(track.enabled).toBe(false); expect(spoken).toHaveLength(1);
  });
  it('resumes recording after playback without reopening microphone', async () => {
    const {session} = make(); await session.start(); await phrase();
    expect(Recorder.instances).toHaveLength(1);
    spoken[0].onend?.(); await vi.advanceTimersByTimeAsync(500);
    expect(Recorder.instances).toHaveLength(2); expect(getUserMedia).toHaveBeenCalledTimes(1); expect(track.enabled).toBe(true);
  });
  it('maps Australian English to en', async () => {
    const {session} = make('en-AU'); await session.start(); await phrase();
    expect(request.mock.calls[0][1].body.get('language')).toBe('en');
  });
  it('stops on silence without transcription requests or restart beeps', async () => {
    const {session, options} = make(); await session.start(); await vi.advanceTimersByTimeAsync(31000);
    expect(request).not.toHaveBeenCalled(); expect(track.stop).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledTimes(1); expect(options.onStop).toHaveBeenCalledTimes(1);
  });
  it('handles spoken stop without creating a task', async () => {
    request.mockResolvedValue(new Response(JSON.stringify({transcript: '대화 종료.'})));
    const {session, options} = make(); await session.start(); await phrase();
    expect(options.onMessage).not.toHaveBeenCalled(); expect(track.stop).toHaveBeenCalled();
  });
  it('releases a late microphone grant after cancellation', async () => {
    let grant!: (value: unknown) => void;
    getUserMedia.mockImplementation(() => new Promise(r => {grant = r;}));
    const {session} = make(); const starting = session.start(); session.stop();
    grant({getTracks: () => [track], getAudioTracks: () => [track]}); await starting;
    expect(track.stop).toHaveBeenCalled(); expect(Recorder.instances).toHaveLength(0);
  });
  it('stops cleanly on permission denial', async () => {
    getUserMedia.mockRejectedValue(new Error('denied'));
    const {session, options} = make(); await session.start();
    expect(options.onStop).toHaveBeenCalledOnce(); expect(request).not.toHaveBeenCalled();
  });
  it('aborts transcription on stop and suppresses late transcripts', async () => {
    let resolve!: (value: Response) => void;
    request.mockImplementation(() => new Promise(r => {resolve = r;}));
    const {session, options} = make(); await session.start(); await phrase(); session.stop();
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    resolve(new Response(JSON.stringify({transcript:'늦은 답변'}))); await vi.advanceTimersByTimeAsync(0);
    expect(options.onMessage).not.toHaveBeenCalled();
  });
  it('handles audio-context rejection even when permission is also denied', async () => {
    class FailedContext extends Context { resume = async () => { throw new Error('audio unavailable'); }; }
    vi.stubGlobal('AudioContext', FailedContext);
    getUserMedia.mockRejectedValue(new Error('denied'));
    const {session, options} = make(); await session.start(); await vi.advanceTimersByTimeAsync(0);
    expect(options.onStop).toHaveBeenCalledOnce(); expect(request).not.toHaveBeenCalled();
  });
  it('bounds a stalled transcription request', async () => {
    request.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const {session, options} = make(); await session.start(); await phrase();
    await vi.advanceTimersByTimeAsync(45000);
    expect(options.onStop).toHaveBeenCalledOnce(); expect(track.stop).toHaveBeenCalled();
  });
  it('does not retry after server failure', async () => {
    request.mockResolvedValue(new Response('{}', {status: 503}));
    const {session, options} = make(); await session.start(); await phrase(); await vi.advanceTimersByTimeAsync(5000);
    expect(request).toHaveBeenCalledTimes(1); expect(options.onStop).toHaveBeenCalledOnce(); expect(track.stop).toHaveBeenCalled();
  });
});
