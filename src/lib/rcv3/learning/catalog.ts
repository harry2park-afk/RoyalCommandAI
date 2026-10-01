import {PRACTICE_TUTOR_NOTES} from './guided-practice';
import {COURSE,lessons} from './course';
import {coursePackSchema,type CoursePack} from './course-pack';
const ai=coursePackSchema.parse({id:COURSE,version:'2026-10-01-practice-1',title:{en:'AI literacy',ko:'AI 종합 교육'},audience:'general',subject:'AI foundations and practical work',lessons:lessons.map(l=>({id:l.id,title:{en:l.title,ko:l.koTitle},content:{en:l.body,ko:l.ko},objectives:[l.title],sources:['https://hai.stanford.edu/ai-index/2026-ai-index-report','https://arxiv.org/abs/1706.03762'],tutorNotes:PRACTICE_TUTOR_NOTES+' Source snapshot checked 2026-09-21. The term artificial intelligence appears in the 1955 Dartmouth proposal; the meeting was in 1956. Historical methods overlap. Do not invent newer developments.'}))});
// Only RC-reviewed packs are registered here. Student requests cannot publish courses.
const published:ReadonlyMap<string,CoursePack>=new Map([[ai.id,ai]]);
export function registeredCourse(id:string=COURSE){const pack=published.get(id);if(!pack)throw Error('RCV3_NOT_FOUND');return pack;}
