import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeSecretaryVoiceSession } from './realtime-voice-session';
class Channel {
  readyState = "open";
  onopen?: () => void; onmessage?: (e: {data: string}) => void; onclose?: () => void; onerror?: () => void;
  send = vi.fn(); close = vi.fn();
  emit(type: string, extra = {}) { this.onmessage?.({data: JSON.stringify({type, ...extra})}); }
}
class Peer {
  static current: Peer;
  channel = new Channel(); connectionState = 'connected'; onconnectionstatechange?: () => void;
  constructor() { Peer.current = this; }
  addTrack = vi.fn(); createDataChannel = () => this.channel;
  createOffer = async () => ({type:'offer', sdp:'v=0\r\ntest'});
  setLocalDescription = vi.fn(async () => {}); setRemoteDescription = vi.fn(async () => {}); close = vi.fn();
}
class Speech { onend?: () => void; onerror?: () => void; constructor(public text: string) {} }
let track: {enabled: boolean; stop: ReturnType<typeof vi.fn>};
let getUserMedia: ReturnType<typeof vi.fn>;
let spoken: Speech[];
let sessions: RealtimeSecretaryVoiceSession[];
function make() {
  const options = {language:'ko-KR', onPhase:vi.fn(), onLevel:vi.fn(), onTranscript:vi.fn(), onMessage:vi.fn(async () => '답변입니다'), onStatus:vi.fn(), onStop:vi.fn()};
  const session = new RealtimeSecretaryVoiceSession(options); sessions.push(session); return {session, options};
}
async function connect() {
  const result = make(); await result.session.start();
  const channel = Peer.current.channel; channel.onopen?.(); channel.emit('session.updated');
  return {...result, channel};
}
beforeEach(() => {
  vi.useFakeTimers(); sessions=[]; spoken=[];
  track={enabled:true,stop:vi.fn()}; getUserMedia=vi.fn(async () => ({getAudioTracks:()=>[track],getTracks:()=>[track]}));
  vi.stubGlobal('navigator',{mediaDevices:{getUserMedia}}); vi.stubGlobal('RTCPeerConnection',Peer);
  vi.stubGlobal('fetch',vi.fn(async () => new Response('v=0\r\nanswer')));
  vi.stubGlobal('SpeechSynthesisUtterance',Speech);
  vi.stubGlobal('window',{speechSynthesis:{speak:(s:Speech)=>spoken.push(s),cancel:vi.fn()}});
});
afterEach(() => {sessions.forEach(s=>s.stop());vi.useRealTimers();vi.unstubAllGlobals();});
describe('live secretary speech transport',()=>{
  it('starts only on request, and enables audio only after server configuration acknowledgement',async()=>{
    const {session,options}=make();expect(getUserMedia).not.toHaveBeenCalled();await session.start();
    expect(track.enabled).toBe(false);expect(options.onPhase).not.toHaveBeenCalledWith('listening');
    Peer.current.channel.onopen?.();expect(Peer.current.channel.send).toHaveBeenCalled();
    Peer.current.channel.emit('session.updated');expect(track.enabled).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/voice/realtime-session?lang=ko',expect.objectContaining({method:'POST'}));
  });
  it('shows partial text before speech ends; submits final once and speaks the returned answer',async()=>{
    const {channel,options}=await connect();
    channel.emit('input_audio_buffer.speech_started',{item_id:'a'});
    channel.emit('conversation.item.input_audio_transcription.delta',{item_id:'a',delta:'테'});
    expect(options.onTranscript).toHaveBeenLastCalledWith('테');expect(options.onMessage).not.toHaveBeenCalled();
    channel.emit('conversation.item.input_audio_transcription.delta',{item_id:'a',delta:'스트'});
    expect(options.onTranscript).toHaveBeenLastCalledWith('테스트');
    channel.emit('input_audio_buffer.speech_stopped',{item_id:'a'});expect(track.enabled).toBe(false);
    channel.emit('conversation.item.input_audio_transcription.completed',{item_id:'a',transcript:'테스트.'});
    channel.emit('conversation.item.input_audio_transcription.completed',{item_id:'a',transcript:'테스트.'});
    await vi.advanceTimersByTimeAsync(0);
    expect(options.onMessage).toHaveBeenCalledExactlyOnceWith('테스트.');expect(spoken[0].text).toBe('답변입니다');
    spoken[0].onend?.();await vi.advanceTimersByTimeAsync(500);expect(track.enabled).toBe(true);expect(getUserMedia).toHaveBeenCalledOnce();
    channel.emit('conversation.item.input_audio_transcription.completed',{item_id:'a',transcript:'old'});
    expect(options.onMessage).toHaveBeenCalledOnce();
  });
  it('stops safely if the channel closes before playback ends',async()=>{
    const {channel,options}=await connect();
    channel.emit('conversation.item.input_audio_transcription.completed',{item_id:'a',transcript:'질문'});
    await vi.advanceTimersByTimeAsync(0);channel.readyState='closing';spoken[0].onend?.();
    expect(options.onStop).toHaveBeenCalledWith(expect.stringContaining('VOICE_CHANNEL'));expect(track.stop).toHaveBeenCalled();
  });
  it('does not submit spoken stop',async()=>{
    const {channel,options}=await connect();
    channel.emit('conversation.item.input_audio_transcription.completed',{item_id:'a',transcript:'대화 종료'});
    expect(options.onMessage).not.toHaveBeenCalled();expect(track.stop).toHaveBeenCalled();
  });
  it('releases a late permission result after stop',async()=>{
    let grant!: (s:unknown)=>void;getUserMedia.mockImplementation(()=>new Promise(r=>{grant=r;}));
    const {session}=make();const starting=session.start();session.stop();
    grant({getTracks:()=>[track]});await starting;expect(track.stop).toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  });
  it('ignores late events and speech after stop',async()=>{
    const {session,channel,options}=await connect();session.stop();
    channel.emit('conversation.item.input_audio_transcription.completed',{item_id:'a',transcript:'late'});
    expect(options.onMessage).not.toHaveBeenCalled();expect(Peer.current.close).toHaveBeenCalled();
  });
  it('does not retry failed SDP connection',async()=>{
    vi.mocked(fetch).mockResolvedValue(new Response('{}',{status:503}));const {session,options}=make();await session.start();
    expect(options.onStop).toHaveBeenCalledWith(expect.stringContaining('VOICE_CONNECT_503'));expect(track.stop).toHaveBeenCalled();expect(fetch).toHaveBeenCalledOnce();
  });
  it('bounds missing session acknowledgement and missing final result',async()=>{
    const {session,options}=make();await session.start();await vi.advanceTimersByTimeAsync(30000);
    expect(options.onStop).toHaveBeenCalledWith(expect.stringContaining('VOICE_CONNECT'));
    const second=await connect();second.channel.emit('input_audio_buffer.speech_stopped',{item_id:'a'});
    await vi.advanceTimersByTimeAsync(20000);expect(second.options.onStop).toHaveBeenCalledWith(expect.stringContaining('VOICE_FINAL_TIMEOUT'));
  });
  it('retains partial text on transcription error and closes transport',async()=>{
    const {channel,options}=await connect();channel.emit('conversation.item.input_audio_transcription.delta',{item_id:'a',delta:'부분'});
    channel.emit('conversation.item.input_audio_transcription.failed',{item_id:'a'});
    expect(options.onTranscript).toHaveBeenLastCalledWith('부분');expect(options.onMessage).not.toHaveBeenCalled();expect(track.stop).toHaveBeenCalled();
  });
});
