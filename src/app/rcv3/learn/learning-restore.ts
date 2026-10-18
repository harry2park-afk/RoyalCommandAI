import {learningCurriculum} from '@/lib/rcv3/learning/curricula';
import {learningDraftStore,type LearningDraft,type LearningResume,type ReadingMarker} from '@/components/rcv3-toolbox/learning-drafts';

type StorageReader=()=>Pick<Storage,'getItem'|'setItem'>;
export type LearningRestoreSnapshot={
 unit:number;day:number;drafts:Record<string,LearningDraft>;
 messages:LearningResume['messages'];resumed:boolean;marker:ReadingMarker|null;error:boolean;
};

// A mount-scoped snapshot: later writes and other tabs must not replace an active draft.
// React uses null for both SSR and its first hydration render, then reads the browser.
export function createLearningRestore(course:string,owner:string,language:string,v4:boolean,storage:StorageReader){
 let snapshot:LearningRestoreSnapshot|null=null;
 return {
  subscribe:()=>()=>{},
  getServerSnapshot:()=>null,
  getSnapshot:():LearningRestoreSnapshot=>{
   if(snapshot)return snapshot;
   const {lessons,sourceDay}=learningCurriculum(course),store=learningDraftStore(course);
   let error=false;
   const read=<T,>(load:()=>T):T|null=>{try{return load();}catch{error=true;return null;}};
   const drafts:Record<string,LearningDraft>={};
   const source=read(storage);
   if(source){
    for(const lesson of lessons){const draft=read(()=>store.readLearningDraft(source,owner,lesson.id));if(draft)drafts[lesson.id]=draft;}
   }
   const saved=source?read(()=>store.readLearningResume(source,owner,language)):null;
   const bookmark=source&&v4?read(()=>store.readTeachingBookmark(source,owner,language)):null;
   let id=saved?.lesson??bookmark?.lesson??lessons[0].id;
   if(bookmark?.finished&&id===bookmark.lesson)id=lessons.find(lesson=>sourceDay(lesson.id)>bookmark.day)?.id??id;
   const unit=Math.max(0,lessons.findIndex(lesson=>lesson.id===id));
   const marker=source&&v4?read(()=>store.readReadingMarker(source,owner,language)):null;
   snapshot={unit,day:sourceDay(lessons[unit].id),drafts,messages:saved&&id===saved.lesson?saved.messages:[],resumed:Boolean(saved),marker,error};
   return snapshot;
  },
 };
}
