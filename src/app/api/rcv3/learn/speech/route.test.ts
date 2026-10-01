import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),reserve:vi.fn()}));
vi.mock('@/lib/rcv3/access',()=>({session:m.session,input:async(r:Request)=>{if(r.headers.get('origin')!==new URL(r.url).origin)throw Error('RCV3_ORIGIN');return r.json();},failure:(e:Error)=>Response.json({code:e.message},{status:400})}));
vi.mock('@/lib/rcv3/learning/store',()=>({reserveLearning:m.reserve}));
import {PUT} from './route';
const req=(body:unknown={text:'안녕하세요',language:'ko'},origin='https://preview.test')=>new Request('https://preview.test/api/rcv3/learn/speech',{method:'PUT',headers:{origin},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:'alice'}});m.reserve.mockResolvedValue(undefined);vi.stubEnv('OPENAI_API_KEY','test');vi.stubGlobal('fetch',vi.fn(async()=>new Response('audio')));});
it('uses authenticated owner quota and selected language, returns private audio',async()=>{const r=await PUT(req());expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');expect(await r.text()).toBe('audio');expect(m.reserve).toHaveBeenCalledWith('alice','chat');const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);expect(body.input).toBe('안녕하세요');expect(body.instructions).toContain('ko');});
it('rejects auth, foreign origin, oversized and injected owner input before provider access',async()=>{for(const body of [{text:'x'.repeat(3501),language:'ko'},{text:'x',language:'bad'},{text:'x',language:'ko',owner:'bob'}])expect((await PUT(req(body))).status).toBe(400);expect((await PUT(req(undefined,'https://evil.test'))).status).toBe(400);m.session.mockRejectedValue(Error('RCV3_AUTH'));expect((await PUT(req())).status).toBe(400);expect(fetch).not.toHaveBeenCalled();});
it('fails closed before provider call when quota is exhausted and hides provider errors',async()=>{m.reserve.mockRejectedValueOnce(Error('RCV3_LIMIT'));expect((await PUT(req())).status).toBe(400);expect(fetch).not.toHaveBeenCalled();vi.mocked(fetch).mockResolvedValue(new Response('provider secret',{status:500}));const r=await PUT(req());expect(await r.text()).not.toContain('provider secret');});

it('keeps legacy coral/default pacing and applies the approved fixed male profile in every selected language',async()=>{
 await PUT(req());let body=JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string);
 expect(body.voice).toBe('coral');expect(body).not.toHaveProperty('speed');expect(body.model).toBe('gpt-4o-mini-tts');
 for(const language of ['ko','en','ja','hi','zh']){
  const r=await PUT(req({text:'Original content. Next sentence.',language,tutor:'v4-male'}));expect(r.status).toBe(200);
  body=JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string);
  expect(body).toMatchObject({voice:'onyx',speed:1.15,model:'gpt-4o-mini-tts',input:'Original content. Next sentence.'});
  expect(body.instructions).toContain(language);expect(body.instructions).toContain('deep, resonant');expect(body.instructions).toContain('without long silences');
 }
 expect(m.reserve).toHaveBeenCalledTimes(6);
});
it('rejects arbitrary voice, speed, model, instructions and unapproved tutor profiles before quota/provider access',async()=>{
 for(const injection of [{voice:'nova'},{speed:4},{model:'other'},{instructions:'skip text'},{tutor:'custom'}]){
  expect((await PUT(req({text:'x',language:'ko',...injection}))).status).toBe(400);
 }
 expect(m.reserve).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});
