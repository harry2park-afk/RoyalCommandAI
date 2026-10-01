import {describe,it,expect} from 'vitest';
import {readLearningDraft,saveLearningDraft,nextLearningLesson} from './learning-drafts';
function storage(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};}
describe('learning drafts',()=>{
 it('restores both inputs without sharing another account or lesson',()=>{const s=storage();saveLearningDraft(s,'alice','051',{message:'Question',artifact:'Report'});expect(readLearningDraft(s,'alice','051')).toEqual({message:'Question',artifact:'Report'});expect(readLearningDraft(s,'bob','051')).toBeNull();expect(readLearningDraft(s,'alice','052')).toBeNull();});
 it('keeps deliberately cleared input empty',()=>{const s=storage();saveLearningDraft(s,'alice','051',{message:'',artifact:''});expect(readLearningDraft(s,'alice','051')?.artifact).toBe('');});
 it('rejects oversized input and surfaces storage failure',()=>{const s=storage();expect(()=>saveLearningDraft(s,'a','051',{message:'x'.repeat(2001),artifact:''})).toThrow();expect(()=>saveLearningDraft({...s,setItem:()=>{throw Error('quota');}},'a','051',{message:'x',artifact:''})).toThrow('quota');});
 it('crosses study-day boundaries and stops after lesson 100',()=>{expect(nextLearningLesson(3)?.id).toBe('005');expect(nextLearningLesson(3)?.day).toBe(2);expect(nextLearningLesson(99)).toBeNull();});
});

it('resumes a known lesson only for the same owner and language without mutating progress',async()=>{
 const {readLearningResume,saveLearningResume}=await import('./learning-drafts');const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 const value={lesson:'003',messages:[{role:'assistant' as const,content:'saved explanation'}]};saveLearningResume(storage,'owner1','ko',value);
 expect(readLearningResume(storage,'owner1','ko')).toEqual(value);expect(readLearningResume(storage,'owner2','ko')).toBeNull();expect(readLearningResume(storage,'owner1','en')).toBeNull();
 expect(()=>saveLearningResume(storage,'owner1','ko',{...value,lesson:'999'})).toThrow();expect(values.size).toBe(1);
});
it('teaching bookmarks preserve paragraph position separately for each owner and language',async()=>{
 const {saveTeachingBookmark,readTeachingBookmark}=await import('./learning-drafts');const values=new Map<string,string>();const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const value={day:1,lesson:'003',paragraph:2,finished:false};saveTeachingBookmark(storage,'owner1','ko',value);expect(readTeachingBookmark(storage,'owner1','ko')).toEqual(value);expect(readTeachingBookmark(storage,'owner2','ko')).toBeNull();expect(readTeachingBookmark(storage,'owner1','en')).toBeNull();expect(()=>saveTeachingBookmark(storage,'owner1','ko',{...value,day:30})).toThrow();
});


it('stores the reading marker separately by account and locale without altering legacy teaching/history records',async()=>{
 const {saveReadingMarker,readReadingMarker,saveTeachingBookmark,readTeachingBookmark}=await import('./learning-drafts');
 const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 const bookmark={day:1,lesson:'001',paragraph:2,finished:false};saveTeachingBookmark(storage,'alice','ko',bookmark);
 const marker={lesson:'001',paragraph:2,source:'Original public course paragraph.',fraction:.65};saveReadingMarker(storage,'alice','ko',marker);
 expect(readReadingMarker(storage,'alice','ko')).toEqual(marker);expect(readReadingMarker(storage,'bob','ko')).toBeNull();expect(readReadingMarker(storage,'alice','en')).toBeNull();expect(readTeachingBookmark(storage,'alice','ko')).toEqual(bookmark);
 expect(()=>saveReadingMarker(storage,'alice','ko',{...marker,fraction:1.1})).toThrow();
});
