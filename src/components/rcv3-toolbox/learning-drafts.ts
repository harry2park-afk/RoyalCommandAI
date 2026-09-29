import {z} from 'zod';
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
export function nextLearningLesson(index:number){return lessons[index+1]??null;}
