import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {PcmSpeechPlayer} from './pcm-speech-player';
class Context {
 static latest:Context;state='running';currentTime=0;destination={};
 sources:{buffer:{duration:number}|null;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;connect:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;onended:(()=>void)|null}[]=[];
 buffers:Float32Array[]=[];
 constructor(){Context.latest=this;}
 resume=vi.fn(async()=>{this.state='running';});close=vi.fn(async()=>{this.state='closed';});
 createBuffer(_channels:number,length:number,rate:number){const samples=new Float32Array(length);this.buffers.push(samples);return {duration:length/rate,getChannelData:()=>samples};}
 createBufferSource(){const source={buffer:null,start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null};this.sources.push(source);return source;}
}
beforeEach(()=>vi.stubGlobal('window',{AudioContext:Context}));afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function stream(){let control!:ReadableStreamDefaultController<Uint8Array>;const cancel=vi.fn();return {response:new Response(new ReadableStream<Uint8Array>({start:c=>{control=c;},cancel}),{headers:{'Content-Type':'audio/pcm'}}),push:(bytes:Uint8Array)=>control.enqueue(bytes),end:()=>control.close(),cancel};}
it('plays the first partial response before EOF, retains split bytes and waits for the last audio sample',async()=>{
 const pcm=new PcmSpeechPlayer();expect(pcm.available).toBe(false);pcm.prime();expect(pcm.available).toBe(true);
 const data=stream(),reading=vi.fn(),done=vi.fn(),task=pcm.play(data.response,new AbortController().signal,reading).then(done);
 const bytes=new Uint8Array(5764),view=new DataView(bytes.buffer);view.setInt16(0,-32768,true);view.setInt16(2,32767,true);view.setInt16(5762,8192,true);
 data.push(bytes.subarray(0,1));data.push(bytes.subarray(1,5761));await flush();
 const ctx=Context.latest;expect(reading).toHaveBeenCalledOnce();expect(ctx.sources).toHaveLength(1);expect(ctx.buffers[0][0]).toBe(-1);expect(ctx.buffers[0][1]).toBeCloseTo(32767/32768);expect(done).not.toHaveBeenCalled();
 data.push(bytes.subarray(5761));data.end();await flush();expect(ctx.sources).toHaveLength(2);expect(ctx.buffers[1][1]).toBe(0.25);
 expect(ctx.sources[1].start.mock.calls[0][0]).toBeCloseTo(0.16);ctx.sources[0].onended?.();await flush();expect(done).not.toHaveBeenCalled();ctx.sources[1].onended?.();await task;expect(done).toHaveBeenCalledOnce();pcm.dispose();expect(ctx.close).toHaveBeenCalledOnce();
});
it('Stop cancels a pending stream and all scheduled sources, then allows a fresh attempt',async()=>{
 const pcm=new PcmSpeechPlayer();pcm.prime();const data=stream(),task=pcm.play(data.response,new AbortController().signal,vi.fn());const rejected=expect(task).rejects.toThrow('CANCELLED');
 data.push(new Uint8Array(5760));await flush();pcm.stop();await rejected;expect(data.cancel).toHaveBeenCalledOnce();expect(Context.latest.sources[0].stop).toHaveBeenCalledOnce();
 const again=stream(),done=pcm.play(again.response,new AbortController().signal,vi.fn());again.push(new Uint8Array(2));again.end();await flush();Context.latest.sources.at(-1)!.onended?.();await done;
});
it('external abort while downloading cancels the body even before any playback',async()=>{
 const pcm=new PcmSpeechPlayer();pcm.prime();const data=stream(),abort=new AbortController(),task=pcm.play(data.response,abort.signal,vi.fn());const rejected=expect(task).rejects.toThrow('CANCELLED');await flush();abort.abort();await rejected;expect(data.cancel).toHaveBeenCalledOnce();expect(Context.latest.sources).toHaveLength(0);
});
it('fails closed for empty or truncated PCM and wrong content type without scheduling bogus audio',async()=>{
 const pcm=new PcmSpeechPlayer();pcm.prime();
 for(const bytes of [new Uint8Array(0),new Uint8Array(1)]){const data=stream(),task=pcm.play(data.response,new AbortController().signal,vi.fn());const rejected=expect(task).rejects.toThrow('SPEECH');data.push(bytes);data.end();await rejected;}
 await expect(pcm.play(new Response('bad',{headers:{'Content-Type':'audio/mpeg'}}),new AbortController().signal,vi.fn())).rejects.toThrow('SPEECH');expect(Context.latest.sources).toHaveLength(0);
});
it('unsupported or failed context construction remains unavailable for the caller to use its original transport',()=>{
 vi.stubGlobal('window',{});const pcm=new PcmSpeechPlayer();pcm.prime();expect(pcm.available).toBe(false);
 vi.stubGlobal('window',{AudioContext:class{constructor(){throw Error('unavailable');}}});pcm.prime();expect(pcm.available).toBe(false);pcm.dispose();
});
