import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
const mocks = vi.hoisted(() => ({auth:vi.fn(), info:vi.fn(), warn:vi.fn()}));
vi.mock('@/lib/auth', () => ({getCurrentUser:mocks.auth}));
vi.mock('@/lib/logger', () => ({logger:{info:mocks.info,warn:mocks.warn}}));
function input() {
  const form=new FormData();form.append('audio',new Blob(['private-audio']), 'voice.webm');form.append('language','ko');
  return new Request('https://example.test/api/voice/transcribe',{method:'POST',body:form});
}
beforeEach(() => { vi.clearAllMocks();vi.stubEnv('OPENAI_API_KEY','test-secret');mocks.auth.mockResolvedValue({id:'test-user'}); });
afterEach(() => {vi.unstubAllGlobals();vi.unstubAllEnvs()});
describe('voice transcription diagnostic boundaries',()=>{
  it('reports authentication failures without calling provider',async()=>{
    mocks.auth.mockResolvedValue(null);const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    const response=await POST(input());expect(response.status).toBe(401);expect((await response.json()).code).toBe('VOICE_AUTH');expect(fetch).not.toHaveBeenCalled();
  });
  it('reports missing server configuration distinctly',async()=>{
    vi.stubEnv('OPENAI_API_KEY','');const response=await POST(input());expect(response.status).toBe(503);expect((await response.json()).code).toBe('VOICE_CONFIG');
  });
  it('preserves returned text and language but never logs private content',async()=>{
    const fetch=vi.fn(async()=>new Response(JSON.stringify({text:'개인 대화 내용'})));vi.stubGlobal('fetch',fetch);
    const response=await POST(input());expect(response.status).toBe(200);expect((await response.json()).transcript).toBe('개인 대화 내용');
    const call=fetch.mock.calls as unknown as [string,RequestInit][];
    expect((call[0][1].body as FormData).get('language')).toBe('ko');
    const logs=JSON.stringify(mocks.info.mock.calls)+JSON.stringify(mocks.warn.mock.calls);
    expect(logs).not.toContain('개인 대화 내용');expect(logs).not.toContain('private-audio');expect(logs).not.toContain('test-secret');expect(logs).not.toContain('test-user');
  });
  it('records provider status without forwarding provider error bodies',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:{message:'sensitive-provider-detail'}}),{status:429})));
    const response=await POST(input());expect(response.status).toBe(502);const result=await response.json();expect(result.code).toBe('VOICE_PROVIDER');
    expect(JSON.stringify(result)).not.toContain('sensitive-provider-detail');expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain('sensitive-provider-detail');
    expect(mocks.warn.mock.calls[0][1].providerStatus).toBe(429);
  });
  it('distinguishes empty recognition from success',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({text:' '}))));const response=await POST(input());expect(response.status).toBe(422);expect((await response.json()).code).toBe('VOICE_EMPTY');
  });
  it('preserves a timeout while reading the provider body',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,status:200,json:async()=>{throw new DOMException('body timeout','AbortError')}})));
    const response=await POST(input());expect(response.status).toBe(504);expect((await response.json()).code).toBe('VOICE_TIMEOUT');
  });
  it('does not misclassify malformed provider JSON as silence',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('invalid json')));
    const response=await POST(input());expect(response.status).toBe(502);expect((await response.json()).code).toBe('VOICE_PROVIDER');
  });
  it('distinguishes provider timeout',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>{throw new DOMException('timeout','TimeoutError')}));const response=await POST(input());expect(response.status).toBe(504);expect((await response.json()).code).toBe('VOICE_TIMEOUT');
  });
});
