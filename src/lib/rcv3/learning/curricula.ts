import {COURSE,lessons} from './course';
import {groups} from './groups';
import {PRACTICAL_COURSE,practicalLessons,practicalGroups} from './practical-60';
type Lesson={id:string;day:number;title:string;koTitle:string;body:string;ko:string};
type Group={id:string;day:number;koTitle:string;sources:string[]};
function curriculum(id:string,items:readonly Lesson[],sections:Group[],preview=false){
 const groupForSource=(source:string)=>{const group=sections.find(g=>g.sources.includes(source));if(!group)throw Error('UNKNOWN_LESSON');return group;};
 const groupComplete=(group:Group,completed:readonly string[])=>group.sources.every(source=>completed.includes(source));
 const sourceDay=(source:string)=>groupForSource(source).day;
 return {id,preview,lessons:items,groups:sections,groupForSource,sourceDay,groupComplete,completedGroupCount:(completed:readonly string[])=>sections.filter(g=>groupComplete(g,completed)).length,nextLearningLesson:(index:number)=>{const next=items[index+1];return next?{...next,day:sourceDay(next.id)}:null;}};
}
const legacy=curriculum(COURSE,lessons,groups),practical=curriculum(PRACTICAL_COURSE,practicalLessons,practicalGroups,true);
export function learningCurriculum(id=COURSE){if(id===COURSE)return legacy;if(id===PRACTICAL_COURSE)return practical;throw Error('RCV3_NOT_FOUND');}
