import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({complete:vi.fn(),client:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:m.client}));
vi.mock('@/lib/ai/connectors',()=>({getAvailableProviderIds:()=>['openai'],getConnector:()=>({complete:m.complete})}));
import {publicLearningContent,translatedLearningContent,validateTranslation} from './content';
import {learningLabel,learningLanguage} from '@/lib/locale/learning';
import messages from '@/lib/locale/learning-messages.json';
beforeEach(()=>{vi.clearAllMocks();m.client.mockImplementation(()=>{throw Error('quota storage unavailable');});m.complete.mockImplementation(async input=>({content:JSON.stringify(Object.fromEntries(Object.keys(JSON.parse(input.messages[1].content)).map(k=>[k,`訳 ${k}`])))}));});
it('has every UI message in all five languages and normalizes regions',()=>{for(const value of Object.values(messages))for(const lang of ['en','ko','ja','zh','hi'])expect((value as Record<string,string>)[lang]).toBeTruthy();expect(learningLanguage('zh-CN')).toBe('zh');expect(learningLanguage('hi-IN')).toBe('hi');expect(learningLabel('send','ko')).toBe('보내기');});
it('uses native Korean for all 100 lesson bodies and question options without exposing answer keys',()=>{for(let day=1;day<=30;day++){const content=publicLearningContent(day,[],'ko');expect(Object.keys(content).some(k=>k.startsWith('body.'))).toBe(true);expect(Object.keys(content).some(k=>k.includes('answer'))).toBe(false);for(const text of Object.values(content))expect(text.trim()).toBeTruthy();}expect(publicLearningContent(1,[],'ko')['title.001']).toBe('AI 역사: 규칙 기반에서 오늘의 AI까지');});
it('translates only public fields and reuses cached values without another provider request',async()=>{const source=publicLearningContent(1,['q001']);expect(Object.keys(source)).toEqual(['q.q001','q.q001.0','q.q001.1','q.q001.2']);const result=await translatedLearningContent('user','ja',source);expect(Object.keys(result)).toEqual(Object.keys(source));expect(m.client).not.toHaveBeenCalled();expect(m.complete.mock.calls[0][0].messages[1].content).not.toContain('answer');await translatedLearningContent('other-user','ja',source);expect(m.complete).toHaveBeenCalledTimes(1);});
it('rejects missing/extra keys and blank translations',()=>{const source={'q.q001':'Q','q.q001.0':'A'};expect(()=>validateTranslation(source,{'q.q001':'訳'})).toThrow();expect(()=>validateTranslation(source,{...source,answer:'0'})).toThrow();expect(()=>validateTranslation(source,{'q.q001':'','q.q001.0':'A'})).toThrow();});
it('accepts more than the former per-minute and daily limits without quota storage',async()=>{
 for(let i=0;i<40;i++)await translatedLearningContent('same-owner','hi',{['uncached-limit-test.'+i]:'Public source '+i});
 expect(m.complete).toHaveBeenCalledTimes(40);expect(m.client).not.toHaveBeenCalled();
 for(const [request]of m.complete.mock.calls)expect(request.messages[1].content).not.toContain('answer');
});
