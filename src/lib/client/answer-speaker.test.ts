import {beforeEach, afterEach, expect, it, vi} from "vitest";
import {AnswerSpeaker, readSpeakerPreference, saveSpeakerPreference} from "./answer-speaker";
class AudioMock {
  static instances: AudioMock[] = [];
  src = ""; preload = ""; volume = 1;
  onended: (() => void) | null = null; onerror: (() => void) | null = null;
  play = vi.fn(async () => {}); pause = vi.fn();
  removeAttribute() { this.src = ""; }
  constructor() { AudioMock.instances.push(this); }
}
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
const blob = new Blob(["audio"],{type:"audio/mpeg"});
it('video transport replaces local audio and Stop cancels the video transport',async()=>{
 const play=vi.fn(async()=>true),stopPlayback=vi.fn(),status=vi.fn();const speaker=new AnswerSpeaker({load:async()=>blob,play,stopPlayback,status});
 speaker.enqueue({id:'teacher',text:'lesson'});await flush();expect(play).toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();expect(status).toHaveBeenCalledWith('teacher','idle');speaker.stop();expect(stopPlayback).toHaveBeenCalled();
});
beforeEach(()=>{AudioMock.instances=[];vi.stubGlobal("Audio",AudioMock);vi.spyOn(URL,"createObjectURL").mockReturnValue("blob:test");vi.spyOn(URL,"revokeObjectURL").mockImplementation(()=>{});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it("reads every chunk and serializes different AI replies on the same audio element",async()=>{
 const load=vi.fn(async()=>blob),status=vi.fn(),s=new AnswerSpeaker({load,status});s.prime();
 s.enqueue({id:"a",text:"x".repeat(7001)});s.enqueue({id:"b",text:"second"});await flush();
 const a=AudioMock.instances[0];expect(load).toHaveBeenCalledTimes(1);
 for(let i=0;i<4;i++){a.onended?.();await flush();}
 expect(load.mock.calls.map(c=>(c as unknown[])[1])).toEqual(["x".repeat(3500),"x".repeat(3500),"x","second"]);
 expect(AudioMock.instances).toHaveLength(1);expect(status).toHaveBeenCalledWith("b","idle");
});
it("OFF cancels pending fetch and never plays a late response",async()=>{
 let resolve!:(b:Blob)=>void;const load=vi.fn(()=>new Promise<Blob>(r=>resolve=r));const s=new AnswerSpeaker({load,status:vi.fn()});
 s.enqueue({id:"a",text:"one"});const signal=(load.mock.calls[0] as unknown[])[2] as AbortSignal;s.stop("a");expect(signal.aborted).toBe(true);
 resolve(blob);await flush();expect(AudioMock.instances[0].play).not.toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it("OFF during playback removes queued answers from that AI but allows another AI",async()=>{
 const load=vi.fn(async()=>blob);const s=new AnswerSpeaker({load,status:vi.fn()});s.enqueue({id:"a",text:"first"});s.enqueue({id:"a",text:"skip"});s.enqueue({id:"b",text:"next"});await flush();s.stop("a");await flush();
 expect(load.mock.calls.map(c=>(c as unknown[])[1])).toEqual(["first","next"]);expect(AudioMock.instances[0].pause).toHaveBeenCalled();s.stop();
});
it("late rejection from a cancelled request cannot interrupt the new request",async()=>{
 let reject!:(e:Error)=>void;const load=vi.fn().mockImplementationOnce(()=>new Promise((_,r)=>reject=r)).mockResolvedValue(blob);const status=vi.fn();const s=new AnswerSpeaker({load,status});
 s.enqueue({id:"old",text:"old"});s.stop();s.enqueue({id:"new",text:"new"});await flush();reject(new Error("old"));await flush();
 expect(status).not.toHaveBeenCalledWith("old","error");expect(AudioMock.instances[0].src).toBe("blob:test");s.stop();
});
it("surfaces playback failure and allows explicit retry",async()=>{
 const status=vi.fn();const s=new AnswerSpeaker({load:async()=>blob,status});s.prime();AudioMock.instances[0].play.mockRejectedValueOnce(new Error("NotAllowedError"));s.enqueue({id:"a",text:"answer"});await flush();expect(status).toHaveBeenCalledWith("a","error");
 s.prime();s.enqueue({id:"a",text:"answer"});await flush();expect(status).toHaveBeenCalledWith("a","reading");s.stop();
});
it("saves only the chosen ON/OFF preference and tolerates unavailable storage",()=>{
 const values=new Map<string,string>();vi.stubGlobal("localStorage",{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
 saveSpeakerPreference("room-a",true);expect(readSpeakerPreference("room-a")).toBe(true);expect(readSpeakerPreference("room-b")).toBe(false);saveSpeakerPreference("room-a",false);expect(readSpeakerPreference("room-a",true)).toBe(false);
 vi.stubGlobal("localStorage",{getItem:()=>{throw Error();},setItem:()=>{throw Error();}});expect(()=>saveSpeakerPreference("room-a",true)).not.toThrow();expect(readSpeakerPreference("room-a",true)).toBe(true);
});
it('uses the optional streamed transport and reports reading before download completion without a second load',async()=>{
 let end!:()=>void;const load=vi.fn(async()=>blob),status=vi.fn(),primeStream=vi.fn();
 const stream=vi.fn(async(_job:unknown,_text:string,_signal:AbortSignal,reading:()=>void)=>{reading();await new Promise<void>(r=>end=r);return true;});
 const speaker=new AnswerSpeaker({load,status,stream,primeStream});speaker.prime();speaker.enqueue({id:'teacher',text:'greeting and lesson'});await flush();expect(primeStream).toHaveBeenCalledOnce();expect(status).toHaveBeenCalledWith('teacher','reading');expect(load).not.toHaveBeenCalled();expect(status).not.toHaveBeenCalledWith('teacher','idle');end();await flush();expect(status).toHaveBeenCalledWith('teacher','idle');speaker.stop();
});
it('stream fallback happens before a provider load; stream errors never retry through the blob provider',async()=>{
 const load=vi.fn(async()=>blob),status=vi.fn();const fallback=new AnswerSpeaker({load,status,stream:async()=>false});fallback.enqueue({id:'legacy-device',text:'one'});await flush();expect(load).toHaveBeenCalledOnce();fallback.stop();load.mockClear();
 const failed=new AnswerSpeaker({load,status,stream:async()=>{throw Error('provider failed');}});failed.enqueue({id:'failed',text:'one'});await flush();expect(load).not.toHaveBeenCalled();expect(status).toHaveBeenCalledWith('failed','error');failed.stop();
});

it('applies the tutor gain before playback and updates it without creating or restarting audio',async()=>{
 const load=vi.fn(async()=>blob),speaker=new AnswerSpeaker({load,status:vi.fn()});speaker.setVolume(.25);speaker.enqueue({id:'teacher',text:'lesson'});await flush();
 const audio=AudioMock.instances[0];expect(audio.volume).toBe(.25);const plays=audio.play.mock.calls.length;
 speaker.setVolume(0);expect(audio.volume).toBe(0);speaker.setVolume(.7);expect(audio.volume).toBe(.7);
 expect(audio.play).toHaveBeenCalledTimes(plays);expect(load).toHaveBeenCalledOnce();expect(AudioMock.instances).toHaveLength(1);speaker.stop();
});
