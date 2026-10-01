import {z} from 'zod';
import {COURSE} from '@/lib/rcv3/learning/course';
import {learningCurriculum} from '@/lib/rcv3/learning/curricula';
const draftSchema=z.object({message:z.string().max(2000),artifact:z.string().max(6000)}).strict();
export type LearningDraft=z.infer<typeof draftSchema>;
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
function createLearningDraftStore(course:string){
const {lessons,sourceDay}=learningCurriculum(course);
function key(owner:string,lesson:string){
 if(!owner||!lessons.some(l=>l.id===lesson))throw new Error('INVALID_LEARNING_DRAFT');
 return `rc-learning-draft:${encodeURIComponent(owner)}:${course}:${lesson}`;
}
function readLearningDraft(storage:StoragePort,owner:string,lesson:string):LearningDraft|null{
 const raw=storage.getItem(key(owner,lesson));
 return raw===null?null:draftSchema.parse(JSON.parse(raw));
}
function saveLearningDraft(storage:StoragePort,owner:string,lesson:string,draft:LearningDraft){
 storage.setItem(key(owner,lesson),JSON.stringify(draftSchema.parse(draft)));
}
function nextLearningLesson(index:number){const next=lessons[index+1];return next?{...next,day:sourceDay(next.id)}:null;}

const resumeSchema=z.object({lesson:z.string().refine(id=>lessons.some(l=>l.id===id)),messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().max(3000)}).strict()).max(8)}).strict();

function resumeKey(owner:string,language:string){if(!owner||!['en','ko','ja','zh','hi'].includes(language))throw Error('INVALID_RESUME');return `rc-learning-resume:${encodeURIComponent(owner)}:${course}:${language}`;}
function readLearningResume(storage:StoragePort,owner:string,language:string):LearningResume|null{const raw=storage.getItem(resumeKey(owner,language));return raw===null?null:resumeSchema.parse(JSON.parse(raw));}
function saveLearningResume(storage:StoragePort,owner:string,language:string,value:LearningResume){storage.setItem(resumeKey(owner,language),JSON.stringify(resumeSchema.parse(value)));}

const teachingBookmarkSchema=z.object({day:z.number().int().min(1).max(30),lesson:z.string().refine(id=>lessons.some(l=>l.id===id)),paragraph:z.number().int().min(0).max(500),finished:z.boolean()}).strict().refine(v=>sourceDay(v.lesson)===v.day);

function readTeachingBookmark(storage:StoragePort,owner:string,language:string):TeachingBookmark|null{const raw=storage.getItem(`${resumeKey(owner,language)}:teaching`);return raw===null?null:teachingBookmarkSchema.parse(JSON.parse(raw));}
function saveTeachingBookmark(storage:StoragePort,owner:string,language:string,value:TeachingBookmark){storage.setItem(`${resumeKey(owner,language)}:teaching`,JSON.stringify(teachingBookmarkSchema.parse(value)));}

// Separate key keeps old teaching records and V3 recovery readers compatible.
const readingMarkerSchema=z.object({lesson:z.string().refine(id=>lessons.some(l=>l.id===id)),paragraph:z.number().int().min(0).max(500),source:z.string().min(1).max(3000),fraction:z.number().min(0).max(1)}).strict();

function readReadingMarker(storage:StoragePort,owner:string,language:string):ReadingMarker|null{const raw=storage.getItem(`${resumeKey(owner,language)}:reading`);return raw===null?null:readingMarkerSchema.parse(JSON.parse(raw));}
function saveReadingMarker(storage:StoragePort,owner:string,language:string,value:ReadingMarker){storage.setItem(`${resumeKey(owner,language)}:reading`,JSON.stringify(readingMarkerSchema.parse(value)));}

return {readLearningDraft,saveLearningDraft,nextLearningLesson,readLearningResume,saveLearningResume,readTeachingBookmark,saveTeachingBookmark,readReadingMarker,saveReadingMarker};
}
export type LearningResume={lesson:string;messages:{role:"user"|"assistant";content:string}[]};
export type TeachingBookmark={day:number;lesson:string;paragraph:number;finished:boolean};
export type ReadingMarker={lesson:string;paragraph:number;source:string;fraction:number};
const stores=new Map<string,ReturnType<typeof createLearningDraftStore>>();
export function learningDraftStore(course=COURSE){let value=stores.get(course);if(!value){value=createLearningDraftStore(course);stores.set(course,value);}return value;}
export const {readLearningDraft,saveLearningDraft,nextLearningLesson,readLearningResume,saveLearningResume,readTeachingBookmark,saveTeachingBookmark,readReadingMarker,saveReadingMarker}=learningDraftStore();
