import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {learningCurriculum} from './curricula';
import {PRACTICAL_COURSE} from './practical-60';
import {registeredCourse} from './catalog';
import {publicLearningContent} from './content';
import {learningDraftStore} from '@/components/rcv3-toolbox/learning-drafts';
it('covers all 30 days with two distinct practical lessons and no legacy lesson IDs',()=>{
 const course=learningCurriculum(PRACTICAL_COURSE),old=learningCurriculum();
 expect(course.lessons).toHaveLength(60);expect(registeredCourse(PRACTICAL_COURSE).lessons).toHaveLength(60);
 for(let day=1;day<=30;day++){
  expect(course.lessons.filter(l=>course.sourceDay(l.id)===day)).toHaveLength(2);
  const content=publicLearningContent(day,[],'ko',PRACTICAL_COURSE);
  expect(Object.keys(content).filter(k=>k.startsWith('body.'))).toHaveLength(2);expect(Object.keys(content).filter(k=>k.startsWith('title.'))).toHaveLength(60);
  expect(Object.keys(content).some(k=>k.startsWith('q.'))).toBe(false);
 }
 for(const l of course.lessons){expect(old.lessons.some(v=>v.id===l.id)).toBe(false);expect(l.ko).toContain('확인 기준');expect(l.body).toContain('Ask for a revision');}
 expect(()=>publicLearningContent(1,['q001'],'en',PRACTICAL_COURSE)).toThrow();expect(()=>learningCurriculum('unregistered')).toThrow();
});
it('round-trips practical drafts and teaching positions without touching legacy or another owner/locale',()=>{
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const old=learningDraftStore(),test=learningDraftStore(PRACTICAL_COURSE);
 old.saveLearningDraft(storage,'alice','001',{message:'old draft',artifact:'passed evidence'});
 old.saveTeachingBookmark(storage,'alice','ko',{day:1,lesson:'001',paragraph:2,finished:false});
 const oldEntries=[...values.entries()];
 test.saveLearningDraft(storage,'alice','p060',{message:'new question',artifact:'actual test evidence'});
 test.saveLearningResume(storage,'alice','ko',{lesson:'p060',messages:[{role:'assistant',content:'feedback'}]});
 test.saveTeachingBookmark(storage,'alice','ko',{day:30,lesson:'p060',paragraph:2,finished:false});
 expect(test.readLearningDraft(storage,'alice','p060')?.artifact).toBe('actual test evidence');
 expect(test.readTeachingBookmark(storage,'alice','ko')?.day).toBe(30);expect(test.readLearningResume(storage,'alice','ko')?.lesson).toBe('p060');
 expect(test.readLearningDraft(storage,'bob','p060')).toBeNull();expect(test.readLearningResume(storage,'alice','en')).toBeNull();
 for(const [k,v]of oldEntries)expect(values.get(k)).toBe(v);
 expect(()=>old.saveLearningDraft(storage,'alice','p001',{message:'x',artifact:''})).toThrow();
 expect(()=>test.saveTeachingBookmark(storage,'alice','ko',{day:1,lesson:'p060',paragraph:0,finished:false})).toThrow();
});
