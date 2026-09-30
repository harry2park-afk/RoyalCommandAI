import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { COURSE, PASS_MARK, type Certificate, type LearningState } from './course';
export const tables = {progress:'rcv3_preview_learning_progress',attempts:'rcv3_preview_learning_attempts',usage:'rcv3_preview_learning_usage',projects:'rcv3_preview_learning_projects'};
export function learningDB(){return createAdminClient();}
export async function learningState(owner:string):Promise<LearningState>{
 const db=learningDB();
 const [p,c,w]=await Promise.all([db.from(tables.progress).select('lesson').eq('owner_id',owner).eq('course',COURSE),db.from(tables.attempts).select('certificate_id,issued_name,submitted_at,score').eq('owner_id',owner).eq('course',COURSE).not('certificate_id','is',null).order('submitted_at',{ascending:false}).limit(1),db.from(tables.projects).select('lesson,artifact,feedback,score').eq('owner_id',owner).eq('course',COURSE)]);
 if(p.error||c.error||w.error)throw new Error('RCV3_STORAGE');
 const row=c.data?.[0];
 return {work:Object.fromEntries((w.data||[]).map(r=>[r.lesson,{artifact:r.artifact,feedback:r.feedback,score:r.score}])),completed:(p.data||[]).map(r=>r.lesson),certificate:row?{id:row.certificate_id,name:row.issued_name,issuedAt:row.submitted_at,score:row.score}:null};
}
export async function reserveLearning(owner:string,kind:'chat'|'exam'){
 const db=learningDB(),day=new Date().toISOString().slice(0,10),limit=kind==='chat'?30:3;
 for(let slot=0;slot<limit;slot++){
  const r=await db.from(tables.usage).insert({owner_id:owner,day,kind,slot});
  if(!r.error)return;
  if(r.error.code!=='23505')throw new Error('RCV3_STORAGE');
 }
 throw new Error('RCV3_LIMIT');
}
export async function ownCertificate(owner:string,id:string):Promise<Certificate|null>{
 const {data,error}=await learningDB().from(tables.attempts).select('certificate_id,issued_name,submitted_at,score').eq('owner_id',owner).eq('course',COURSE).eq('certificate_id',id).gte('score',PASS_MARK).maybeSingle();
 if(error)throw new Error('RCV3_STORAGE');
 return data?{id:data.certificate_id,name:data.issued_name,issuedAt:data.submitted_at,score:data.score}:null;
}
