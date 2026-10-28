import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
const mocks = vi.hoisted(() => ({auth:vi.fn(),info:vi.fn(),warn:vi.fn()}));
vi.mock('@/lib/auth',()=>({getCurrentUser:mocks.auth}));
vi.mock('@/lib/logger',()=>({logger:{info:mocks.info,warn:mocks.warn}}));
const input = () => new Request('https://example.test/api/voice/realtime-session?lang=ko',{method:'POST',body:'v=0\r\nprivate-sdp'});
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();vi.stubEnv('OPENAI_API_KEY','private-key');mocks.auth.mockResolvedValue({id:'private-user'});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('realtime connection deadlines and diagnostics',()=>{
  it('preserves SDP response and session language without logging private data',async()=>{
    const fetch=vi.fn(async()=>new Response('v=0\r\nprivate-answer'));vi.stubGlobal('fetch',fetch);
    const result=await POST(input());expect(result.status).toBe(200);expect(await result.text()).toBe('v=0\r\nprivate-answer');
    const calls=fetch.mock.calls as unknown as [string,RequestInit][];
    const form=calls[0][1].body as FormData;expect(JSON.parse(String(form.get('session'))).audio.input.transcription.languages).toEqual(['ko','en']);
    expect(JSON.stringify(mocks.info.mock.calls)).not.toMatch(/private-(key|user|sdp|answer)/);
  });
  it('does not call provider without authentication or server config',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);mocks.auth.mockResolvedValue(null);
    expect((await POST(input())).status).toBe(401);mocks.auth.mockResolvedValue({id:'user'});vi.stubEnv('OPENAI_API_KEY','');
    expect((await POST(input())).status).toBe(503);expect(fetch).not.toHaveBeenCalled();
  });
  it('bounds auth and never calls provider after a late auth result',async()=>{
    let resolve!: (value:unknown)=>void;mocks.auth.mockImplementation(()=>new Promise(r=>{resolve=r}));
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const pending=POST(input());await vi.advanceTimersByTimeAsync(5000);
    expect((await (await pending).json()).code).toBe('VOICE_AUTH_TIMEOUT');resolve({id:'late'});await vi.advanceTimersByTimeAsync(0);expect(fetch).not.toHaveBeenCalled();
  });
  it('bounds a stalled request body before contacting provider',async()=>{
    const request=input();vi.spyOn(request,'text').mockImplementation(()=>new Promise(()=>{}));vi.stubGlobal('fetch',vi.fn());
    const pending=POST(request);await vi.advanceTimersByTimeAsync(2000);expect((await (await pending).json()).code).toBe('VOICE_SDP_TIMEOUT');expect(fetch).not.toHaveBeenCalled();
  });
  it('aborts a stuck upstream request after 15 seconds without retry',async()=>{
    let signal!: AbortSignal;const fetch=vi.fn((_url,init)=>{signal=init.signal;return new Promise(()=>{})});vi.stubGlobal('fetch',fetch);
    const pending=POST(input());await vi.advanceTimersByTimeAsync(15000);const response=await pending;
    expect(response.status).toBe(504);expect((await response.json()).code).toBe('VOICE_PROVIDER_TIMEOUT');expect(signal.aborted).toBe(true);expect(fetch).toHaveBeenCalledOnce();
  });
  it('includes stalled response body in the same upstream deadline',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,status:200,text:()=>new Promise(()=>{})})));
    const pending=POST(input());await vi.advanceTimersByTimeAsync(15000);expect((await (await pending).json()).code).toBe('VOICE_PROVIDER_TIMEOUT');
    expect(mocks.info).toHaveBeenCalledWith('voice.realtime.stage',expect.objectContaining({stage:'provider_headers_received'}));
  });
  it.each([[401,'VOICE_PROVIDER_AUTH'],[429,'VOICE_PROVIDER_LIMIT'],[400,'VOICE_PROVIDER_REQUEST'],[503,'VOICE_PROVIDER_UNAVAILABLE']])('classifies provider %s without retry or raw error exposure',async(status,code)=>{
    const fetch=vi.fn(async()=>new Response('private-provider-body',{status:Number(status)}));vi.stubGlobal('fetch',fetch);
    const response=await POST(input());const body=await response.json();expect(body.code).toBe(code);expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.stringify(body)+JSON.stringify(mocks.warn.mock.calls)).not.toContain('private-provider-body');
    expect(mocks.warn).toHaveBeenCalledWith('voice.realtime.failed',expect.objectContaining({providerStatus:status}));
  });
  it('rejects a non-SDP success response',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}')));expect((await (await POST(input())).json()).code).toBe('VOICE_PROVIDER_RESPONSE');
  });
});
