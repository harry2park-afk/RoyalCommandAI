import { z } from 'zod';
import { session,input,reply,failure } from '@/lib/rcv3/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { canManageToolbox } from '@/lib/rcv3/toolbox-authority';
import { draftEmail,reviewEmail,emailReady,EMAIL_TABLE } from '@/lib/rcv3/email-outbox';
import { emailDigest } from '@/lib/rcv3/email-approval';
async function owner(){const {user}=await session();if(!canManageToolbox(user))throw new Error('RCV3_EMAIL_APPROVAL_REQUIRED');return user;}
export async function GET(){try{
 await owner();const r=await createAdminClient().from(EMAIL_TABLE).select('id,envelope,status,provider_id,created_at,kind,last_error').order('created_at',{ascending:false}).limit(100);
 if(r.error)throw new Error('RCV3_STORAGE');
 return reply({notices:(r.data??[]).map(row=>({...row,digest:emailDigest(row.envelope)})),configured:emailReady()});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const user=await owner();const d=z.object({requestId:z.string().uuid(),recipient:z.string().email(),subject:z.string().min(1).max(200),text:z.string().min(1).max(20000)}).strict().parse(await input(request,25000));
 const row=await draftEmail({id:d.requestId,recipients:[d.recipient],subject:d.subject,text:d.text},user);
 return reply({id:row.id,status:row.status});
}catch(e){return failure(e);}}
export async function PUT(request:Request){try{
 const user=await owner();const d=z.object({id:z.string().uuid(),digest:z.string().regex(/^[a-f0-9]{64}$/),decision:z.enum(['approve','reject'])}).strict().parse(await input(request,1000));
 await reviewEmail(d.id,d.digest,d.decision,user);return reply({status:d.decision==='approve'?'approved':'rejected'});
}catch(e){return failure(e);}}
