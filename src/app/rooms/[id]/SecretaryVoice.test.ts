import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SecretaryVoice from './SecretaryVoice';

const hooks = vi.hoisted(() => ({ cleanups: [] as Array<() => void> }));
vi.mock('react', () => ({
  useState: (value: unknown) => [value, vi.fn()],
  useRef: (value: unknown) => ({ current: value }),
  useEffect: (effect: () => (() => void)) => hooks.cleanups.push(effect()),
}));

class Mic {
  static instances: Mic[] = [];
  onstart?: () => void;
  onend?: () => void;
  onerror?: (e: { error: string }) => void;
  onresult?: (e: unknown) => void;
  abort = vi.fn();
  start = vi.fn(() => this.onstart?.());
  constructor() { Mic.instances.push(this); }
  say(text: string) {
    this.onresult?.({ results: [{ isFinal: true, 0: { transcript: text } }] });
    this.onend?.();
  }
}
class Speech {
  onend?: () => void;
  onerror?: () => void;
  constructor(public text: string) {}
}
let spoken: Speech[];
let visibility: (() => void) | undefined;
let cancel: ReturnType<typeof vi.fn>;
function start(onMessage = vi.fn(async () => '답변입니다.')) {
  const onActiveChange = vi.fn();
  const tree = SecretaryVoice({ onMessage, busy: false, onActiveChange });
  tree.props.children[0].props.children[0].props.onClick();
  return { onMessage, onActiveChange };
}
beforeEach(() => {
  vi.useFakeTimers(); Mic.instances = []; hooks.cleanups = []; spoken = []; cancel = vi.fn();
  vi.stubGlobal('window', { SpeechRecognition: Mic, speechSynthesis: { speak: (s: Speech) => spoken.push(s), cancel } });
  vi.stubGlobal('SpeechSynthesisUtterance', Speech);
  vi.stubGlobal('document', { hidden: false, addEventListener: (_: string, cb: () => void) => { visibility = cb; }, removeEventListener: vi.fn() });
});
afterEach(() => { hooks.cleanups.forEach(fn => fn()); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('secretary voice session with simulated browser speech services', () => {
  it('does not listen on mount', () => {
    SecretaryVoice({ onMessage: vi.fn(), busy: false, onActiveChange: vi.fn() });
    expect(Mic.instances).toHaveLength(0);
  });
  it('submits once, speaks with mic stopped, then resumes after playback', async () => {
    const { onMessage } = start();
    const mic = Mic.instances[0];
    mic.say('오늘 할 일'); mic.onend?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(onMessage).toHaveBeenCalledExactlyOnceWith('오늘 할 일');
    expect(spoken[0].text).toBe('답변입니다.');
    expect(Mic.instances).toHaveLength(1);
    spoken[0].onend?.();
    await vi.advanceTimersByTimeAsync(350);
    expect(Mic.instances).toHaveLength(2);
  });
  it('stops by voice without sending stop as a task', () => {
    const { onMessage, onActiveChange } = start();
    Mic.instances[0].say('대화 종료.');
    expect(onMessage).not.toHaveBeenCalled();
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
  });
  it('does not restart after microphone permission denial', async () => {
    const { onActiveChange } = start();
    Mic.instances[0].onerror?.({ error: 'not-allowed' });
    await vi.runAllTimersAsync();
    expect(Mic.instances).toHaveLength(1);
    expect(Mic.instances[0].abort).toHaveBeenCalled();
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
  });
  it('does not speak a late response after leaving the conversation', async () => {
    let resolve!: (value: string) => void;
    start(vi.fn(() => new Promise<string>(r => { resolve = r; })));
    Mic.instances[0].say('질문');
    hooks.cleanups[0](); resolve('늦은 답변');
    await vi.advanceTimersByTimeAsync(0);
    expect(spoken).toHaveLength(0);
  });
  it('stops and releases playback when hidden', async () => {
    const { onActiveChange } = start();
    Mic.instances[0].say('질문');
    await vi.advanceTimersByTimeAsync(0);
    Object.assign(document, { hidden: true }); visibility?.();
    expect(cancel).toHaveBeenCalled();
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
    await vi.runAllTimersAsync(); expect(Mic.instances).toHaveLength(1);
  });
  it('bounds silence restarts', async () => {
    const { onActiveChange } = start();
    for (let i = 0; i < 3; i++) { Mic.instances.at(-1)?.onend?.(); await vi.advanceTimersByTimeAsync(500); }
    expect(Mic.instances).toHaveLength(3);
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
  });
});
