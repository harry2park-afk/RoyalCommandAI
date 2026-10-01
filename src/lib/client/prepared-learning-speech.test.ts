import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {PreparedLearningSpeech} from './prepared-learning-speech';
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
it('reuses the same pending request and unread stream without waiting for EOF',async()=>{
 let deliver!:(r:Response)=>void;let body!:ReadableStreamDefaultController<Uint8Array>;
 const request=vi.fn(()=>new Promise<Response>(resolve=>{deliver=resolve;})),warm=new PreparedLearningSpeech(request);
 warm.prepare('Greeting and selected paragraph','pcm');expect(request).toHaveBeenCalledTimes(1);
 const audio=warm.consume('Greeting and selected paragraph','pcm',new AbortController().signal,async r=>{
  const reader=r.body!.getReader();const first=await reader.read();await reader.cancel();return first.value;
 });
 deliver(new Response(new ReadableStream<Uint8Array>({start(c){body=c;c.enqueue(new Uint8Array([1,2]));}}),{headers:{'Content-Type':'audio/pcm'}}));
 expect(await audio).toEqual(new Uint8Array([1,2]));expect(request).toHaveBeenCalledTimes(1);expect(()=>body.close()).toThrow();
});
it('reuses completed preparation exactly once, then requires another explicit request',async()=>{
 const request=vi.fn<(text:string,format:string,signal:AbortSignal)=>Promise<Response>>(async()=>new Response('audio')),warm=new PreparedLearningSpeech(request);
 warm.prepare('paragraph','blob');await Promise.resolve();
 expect(await warm.consume('paragraph','blob',new AbortController().signal,r=>r.text())).toBe('audio');expect(request).toHaveBeenCalledTimes(1);
 await warm.consume('paragraph','blob',new AbortController().signal,r=>r.text());expect(request).toHaveBeenCalledTimes(2);
});
it.each([['different','pcm'],['prepared','blob']] as const)('does not reuse a mismatched text/transport',async(text,format)=>{
 const request=vi.fn<(text:string,format:string,signal:AbortSignal)=>Promise<Response>>(async()=>new Response('audio')),warm=new PreparedLearningSpeech(request);
 warm.prepare('prepared','pcm');const signal=request.mock.calls[0][2];
 await warm.consume(text,format,new AbortController().signal,r=>r.text());expect(request).toHaveBeenCalledTimes(2);expect(signal.aborted).toBe(true);
});
it('abort while waiting for prepared headers aborts the one request, without retry',async()=>{
 const request=vi.fn((_text:string,_format:string,signal:AbortSignal)=>new Promise<Response>((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled'))))),warm=new PreparedLearningSpeech(request);
 warm.prepare('paragraph','pcm');const abort=new AbortController();const audio=warm.consume('paragraph','pcm',abort.signal,r=>r.text());abort.abort();
 await expect(audio).rejects.toThrow('cancelled');expect(request).toHaveBeenCalledTimes(1);
});
it('abort during prepared body consumption cancels the upstream request',async()=>{
 const request=vi.fn((_text:string,_format:string,signal:AbortSignal)=>Promise.resolve(new Response(new ReadableStream({start(c){signal.addEventListener('abort',()=>c.error(Error('cancelled')));}})))),warm=new PreparedLearningSpeech(request);
 warm.prepare('paragraph','pcm');const abort=new AbortController();const audio=warm.consume('paragraph','pcm',abort.signal,r=>r.text());await Promise.resolve();abort.abort();await expect(audio).rejects.toThrow();expect(request).toHaveBeenCalledTimes(1);
});
it('expires unused audio and never regenerates it automatically',async()=>{
 const request=vi.fn<(text:string,format:string,signal:AbortSignal)=>Promise<Response>>(()=>Promise.resolve(new Response('audio'))),warm=new PreparedLearningSpeech(request);
 warm.prepare('paragraph','pcm');await Promise.resolve();vi.advanceTimersByTime(35000);expect(request.mock.calls[0][2].aborted).toBe(false);
 vi.advanceTimersByTime(85000);expect(request.mock.calls[0][2].aborted).toBe(true);expect(request).toHaveBeenCalledTimes(1);
});
it('a failed warm-up is recoverable only on explicit consume',async()=>{
 const request=vi.fn(async()=>new Response('',{status:503})),warm=new PreparedLearningSpeech(request);
 warm.prepare('paragraph','pcm');await vi.runAllTimersAsync();expect(request).toHaveBeenCalledTimes(1);
 request.mockImplementation(async()=>new Response('audio'));expect(await warm.consume('paragraph','pcm',new AbortController().signal,r=>r.text())).toBe('audio');expect(request).toHaveBeenCalledTimes(2);
});
it('clear and already-aborted consume do not start a new request',async()=>{
 const request=vi.fn<(text:string,format:string,signal:AbortSignal)=>Promise<Response>>(()=>Promise.resolve(new Response('audio'))),warm=new PreparedLearningSpeech(request);
 warm.prepare('paragraph','pcm');warm.clear();expect(request.mock.calls[0][2].aborted).toBe(true);
 const abort=new AbortController();abort.abort();await expect(warm.consume('paragraph','pcm',abort.signal,r=>r.text())).rejects.toThrow('CANCELLED');expect(request).toHaveBeenCalledTimes(1);
});
