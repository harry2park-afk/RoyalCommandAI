import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {examQuestions,grade,publicQuestion,questionById} from './questions';
it('grades the 70-point boundary on server answers',()=>{const q=examQuestions(()=>0),ids=q.map(q=>q.id),a=q.map(q=>q.answer);expect(grade(ids,a)).toBe(100);const wrong=a.map((v,i)=>i<9?(v+1)%3:v);expect(grade(ids,wrong)).toBe(70);wrong[9]=(wrong[9]+1)%3;expect(grade(ids,wrong)).toBe(67);});
it('never serializes the answer key in question payloads',()=>{for(const q of examQuestions(()=>0))expect(publicQuestion(q)).not.toHaveProperty('answer');});
it('rejects forged question sets and malformed responses',()=>{const ids=examQuestions(()=>0).map(q=>q.id);expect(()=>grade(ids.slice(1),[])).toThrow();expect(()=>grade(Array(30).fill(ids[0]),Array(30).fill(0))).toThrow();expect(()=>grade(ids,Array(30).fill(3))).toThrow();expect(questionById('forged')).toBeUndefined();});
