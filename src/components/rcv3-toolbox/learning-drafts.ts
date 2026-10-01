import {z} from 'zod';
import {sourceDay} from '@/lib/rcv3/learning/groups';
import {COURSE,lessons} from '@/lib/rcv3/learning/course';
const draftSchema=z.object({message:z.string().max(2000),artifact:z.string().max(6000)}).strict();
export type LearningDraft=z.infer<typeof draftSchema>;
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
function key(owner:string,lesson:string){
 if(!owner||!lessons.some(l=>l.id===lesson))throw new Error('INVALID_LEARNING_DRAFT');
 return `rc-learning-draft:${encodeURIComponent(owner)}:${COURSE}:${lesson}`;
}
export function readLearningDraft(storage:StoragePort,owner:string,lesson:string):LearningDraft|null{
 const raw=storage.getItem(key(owner,lesson));
 return raw===null?null:draftSchema.parse(JSON.parse(raw));
}
export function saveLearningDraft(storage:StoragePort,owner:string,lesson:string,draft:LearningDraft){
 storage.setItem(key(owner,lesson),JSON.stringify(draftSchema.parse(draft)));
}
export function nextLearningLesson(index:number){const next=lessons[index+1];return next?{...next,day:sourceDay(next.id)}:null;}

const resumeSchema=z.object({lesson:z.string().refine(id=>lessons.some(l=>l.id===id)),messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().max(3000)}).strict()).max(8)}).strict();
export type LearningResume=z.infer<typeof resumeSchema>;
function resumeKey(owner:string,language:string){if(!owner||!['en','ko','ja','zh','hi'].includes(language))throw Error('INVALID_RESUME');return `rc-learning-resume:${encodeURIComponent(owner)}:${COURSE}:${language}`;}
export function readLearningResume(storage:StoragePort,owner:string,language:string):LearningResume|null{const raw=storage.getItem(resumeKey(owner,language));return raw===null?null:resumeSchema.parse(JSON.parse(raw));}
export function saveLearningResume(storage:StoragePort,owner:string,language:string,value:LearningResume){storage.setItem(resumeKey(owner,language),JSON.stringify(resumeSchema.parse(value)));}

const teachingBookmarkSchema=z.object({day:z.number().int().min(1).max(30),lesson:z.string().refine(id=>lessons.some(l=>l.id===id)),paragraph:z.number().int().min(0).max(500),finished:z.boolean()}).strict().refine(v=>sourceDay(v.lesson)===v.day);
export type TeachingBookmark=z.infer<typeof teachingBookmarkSchema>;
export function readTeachingBookmark(storage:StoragePort,owner:string,language:string):TeachingBookmark|null{const raw=storage.getItem(`${resumeKey(owner,language)}:teaching`);return raw===null?null:teachingBookmarkSchema.parse(JSON.parse(raw));}
export function saveTeachingBookmark(storage:StoragePort,owner:string,language:string,value:TeachingBookmark){storage.setItem(`${resumeKey(owner,language)}:teaching`,JSON.stringify(teachingBookmarkSchema.parse(value)));}

// Separate key keeps old teaching records and V3 recovery readers compatible.
const readingMarkerSchema=z.object({lesson:z.string().refine(id=>lessons.some(l=>l.id===id)),paragraph:z.number().int().min(0).max(500),source:z.string().min(1).max(3000),fraction:z.number().min(0).max(1)}).strict();
export type ReadingMarker=z.infer<typeof readingMarkerSchema>;
export function readReadingMarker(storage:StoragePort,owner:string,language:string):ReadingMarker|null{const raw=storage.getItem(`${resumeKey(owner,language)}:reading`);return raw===null?null:readingMarkerSchema.parse(JSON.parse(raw));}
export function saveReadingMarker(storage:StoragePort,owner:string,language:string,value:ReadingMarker){storage.setItem(`${resumeKey(owner,language)}:reading`,JSON.stringify(readingMarkerSchema.parse(value)));}
