import {expect,it} from 'vitest';
import {COURSE} from '@/lib/rcv3/learning/course';
import {learningDraftStore} from '@/components/rcv3-toolbox/learning-drafts';
import {createLearningRestore} from './learning-restore';

function fixture(){
 const values=new Map<string,string>();
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 return {values,storage,store:learningDraftStore(COURSE)};
}
it('does not read browser storage on the server and caches recovery across ordinary renders',()=>{
 const {storage,store}=fixture();let reads=0;
 store.saveLearningDraft(storage,'alice','005',{message:'Saved question',artifact:'Saved work'});
 store.saveLearningResume(storage,'alice','ko',{lesson:'005',messages:[{role:'assistant',content:'Saved answer'}]});
 const recovery=createLearningRestore(COURSE,'alice','ko',true,()=>{reads++;return storage;});
 expect(recovery.getServerSnapshot()).toBeNull();expect(reads).toBe(0);
 const first=recovery.getSnapshot();expect(first).toMatchObject({unit:4,resumed:true,error:false,messages:[{role:'assistant',content:'Saved answer'}]});
 store.saveLearningDraft(storage,'alice','005',{message:'Current typing',artifact:'Current work'});
 expect(recovery.getSnapshot()).toBe(first);expect(reads).toBe(1);
 expect(first.drafts['005'].message).toBe('Saved question');
 expect(createLearningRestore(COURSE,'alice','ko',true,()=>storage).getSnapshot().drafts['005'].message).toBe('Current typing');
});
it('isolates owners and languages without deleting original storage',()=>{
 const {storage,store,values}=fixture();
 store.saveLearningResume(storage,'alice','ko',{lesson:'005',messages:[{role:'assistant',content:'Private answer'}]});
 store.saveLearningDraft(storage,'alice','005',{message:'Private draft',artifact:'Private work'});
 const before=[...values];
 expect(createLearningRestore(COURSE,'bob','ko',true,()=>storage).getSnapshot()).toMatchObject({unit:0,messages:[],drafts:{},resumed:false});
 expect(createLearningRestore(COURSE,'alice','en',true,()=>storage).getSnapshot()).toMatchObject({unit:0,messages:[],resumed:false});
 expect([...values]).toEqual(before);
});
it('retains valid drafts when another stored record is malformed',()=>{
 const {storage,store,values}=fixture();
 store.saveLearningDraft(storage,'alice','001',{message:'Keep question',artifact:'Keep work'});
 values.set(`rc-learning-resume:alice:${COURSE}:ko`,'broken JSON');
 values.set(`rc-learning-draft:alice:${COURSE}:002`,'broken JSON');
 const result=createLearningRestore(COURSE,'alice','ko',true,()=>storage).getSnapshot();
 expect(result.error).toBe(true);expect(result.drafts['001']).toEqual({message:'Keep question',artifact:'Keep work'});
 expect(result.messages).toEqual([]);expect(result.resumed).toBe(false);
});
it('advances a finished teaching bookmark without copying previous lesson chat or changing completion',()=>{
 const {storage,store,values}=fixture();
 store.saveLearningResume(storage,'alice','ko',{lesson:'001',messages:[{role:'assistant',content:'Yesterday'}]});
 store.saveTeachingBookmark(storage,'alice','ko',{day:1,lesson:'001',paragraph:1,finished:true});
 const before=[...values];
 const result=createLearningRestore(COURSE,'alice','ko',true,()=>storage).getSnapshot();
 expect(result.day).toBe(2);expect(result.unit).toBeGreaterThan(0);expect(result.messages).toEqual([]);expect([...values]).toEqual(before);
});
it('restores the V4 reading marker while V3 ignores teaching-only records',()=>{
 const {storage,store}=fixture();
 const marker={lesson:'001',paragraph:0,source:'A remembered paragraph.',fraction:0.6};
 store.saveReadingMarker(storage,'alice','ko',marker);
 expect(createLearningRestore(COURSE,'alice','ko',true,()=>storage).getSnapshot().marker).toEqual(marker);
 expect(createLearningRestore(COURSE,'alice','ko',false,()=>storage).getSnapshot().marker).toBeNull();
});
it('reports blocked storage without throwing or trying to replace stored data',()=>{
 const recovery=createLearningRestore(COURSE,'alice','ko',true,()=>{throw new Error('Storage denied');});
 expect(recovery.getSnapshot()).toMatchObject({unit:0,messages:[],drafts:{},error:true,resumed:false});
});
