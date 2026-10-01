import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),client:vi.fn()}));
vi.mock('@/lib/rcv3/access',()=>({session:m.session,input:async(r:Request)=>{if(r.headers.get('origin')!==new URL(r.url).origin)throw Error('RCV3_ORIGIN');return r.json();},failure:(e:Error)=>Response.json({code:e.message},{status:400})}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:m.client}));
import {PUT} from './route';
const req=(body:unknown={text:'안녕하세요',language:'ko'},origin='https://preview.test')=>new Request('https://preview.test/api/rcv3/learn/speech',{method:'PUT',headers:{origin},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:'alice'}});m.client.mockImplementation(()=>{throw Error('quota storage unavailable');});vi.stubEnv('OPENAI_API_KEY','test');vi.stubGlobal('fetch',vi.fn(async()=>new Response('audio')));});
it('keeps authenticated speech and selected language, returns private audio',async()=>{const r=await PUT(req());expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');expect(await r.text()).toBe('audio');expect(m.client).not.toHaveBeenCalled();const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);expect(body.input).toBe('안녕하세요');expect(body.instructions).toContain('ko');});
it('rejects auth, foreign origin, oversized and injected owner input before provider access',async()=>{for(const body of [{text:'x'.repeat(3501),language:'ko'},{text:'x',language:'bad'},{text:'x',language:'ko',owner:'bob'}])expect((await PUT(req(body))).status).toBe(400);expect((await PUT(req(undefined,'https://evil.test'))).status).toBe(400);m.session.mockRejectedValue(Error('RCV3_AUTH'));expect((await PUT(req())).status).toBe(400);expect(fetch).not.toHaveBeenCalled();});
it('allows more than thirty speech requests without quota storage and hides provider errors',async()=>{for(let i=0;i<40;i++)expect((await PUT(req())).status).toBe(200);expect(m.client).not.toHaveBeenCalled();vi.mocked(fetch).mockResolvedValue(new Response('provider secret',{status:500}));const r=await PUT(req());expect(await r.text()).not.toContain('provider secret');});

it('keeps legacy coral/default pacing and applies the approved fixed male profile in every selected language',async()=>{
 await PUT(req());let body=JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string);
 expect(body.voice).toBe('coral');expect(body).not.toHaveProperty('speed');expect(body.model).toBe('gpt-4o-mini-tts');
 for(const language of ['ko','en','ja','hi','zh']){
  const r=await PUT(req({text:'Original content. Next sentence.',language,tutor:'v4-male'}));expect(r.status).toBe(200);
  body=JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string);
  expect(body).toMatchObject({voice:'onyx',speed:1.15,model:'gpt-4o-mini-tts',input:'Original content. Next sentence.'});
  expect(body.instructions).toContain(language);expect(body.instructions).toContain('deep, resonant');expect(body.instructions).toContain('without long silences');
 }
 expect(m.client).not.toHaveBeenCalled();
});
it('rejects arbitrary voice, speed, model, instructions and unapproved tutor profiles before provider access',async()=>{
 for(const injection of [{voice:'nova'},{speed:4},{model:'other'},{instructions:'skip text'},{tutor:'custom'}]){
  expect((await PUT(req({text:'x',language:'ko',...injection}))).status).toBe(400);
 }
 expect(m.client).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});
it('returns the male PCM body incrementally without quota storage access',async()=>{
 let stream!:ReadableStreamDefaultController<Uint8Array>;const audio=new ReadableStream<Uint8Array>({start:c=>{stream=c;}});
 vi.mocked(fetch).mockResolvedValue(new Response(audio));const r=await PUT(req({text:'Greeting and original lesson',language:'ko',tutor:'v4-male',stream:true}));
 expect(r.headers.get('content-type')).toBe('audio/pcm');expect(r.headers.get('cache-control')).toBe('no-store');expect(m.client).not.toHaveBeenCalled();
 const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);expect(body).toMatchObject({voice:'onyx',speed:1.15,response_format:'pcm',input:'Greeting and original lesson'});
 const reader=r.body!.getReader();stream.enqueue(new Uint8Array([1,2]));expect(await reader.read()).toMatchObject({done:false,value:new Uint8Array([1,2])});stream.close();expect((await reader.read()).done).toBe(true);
});
it('rejects streaming outside the male profile and arbitrary stream flags before provider access',async()=>{
 for(const body of [{text:'one',language:'ko',stream:true},{text:'one',language:'ko',tutor:'v4-male',stream:false},{text:'one',language:'ko',tutor:'v4-male',stream:'pcm'}])expect((await PUT(req(body))).status).toBe(400);
 expect(m.client).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});
