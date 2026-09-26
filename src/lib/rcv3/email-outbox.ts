import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { approveEmail, emailDigest, emailEnvelopeSchema, requireEmailApproval, type EmailApproval, type EmailEnvelope } from './email-approval';
import { canManageToolbox } from './toolbox-authority';
export const EMAIL_TABLE='rcv3_preview_email_notices';
export type EmailNotice={id:string;envelope:EmailEnvelope;sender:string;kind:'notice'|'card_expiring'|'card_expired';order_id:string|null;approval:EmailApproval|null;status:string;created_at:string;first_attempt_at:string|null;lease_until:string|null;claim_token:string|null;provider_id:string|null};
type Owner={id:string;email:string;mode:string}|null;
export function emailSender(){return z.string().email().parse(process.env.RCV3_EMAIL_FROM);}
export function emailReady(){return process.env.RCV3_EMAIL_ENABLED==='true' && !!process.env.RESEND_API_KEY && !!process.env.RCV3_EMAIL_FROM && !!process.env.RCV3_EMAIL_TEST_RECIPIENTS;}
export function requireEmailWorker(request:Request){
 const secret=process.env.RCV3_EMAIL_WORKER_SECRET||'',actual=request.headers.get('authorization')||'';
 const expected=`Bearer ${secret}`;
 if(process.env.VERCEL_ENV!=='preview'||secret.length<32||actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))throw new Error('RCV3_AUTH');
}
export async function draftEmail(candidate:EmailEnvelope,owner:Owner,db=createAdminClient()){
 if(!canManageToolbox(owner))throw new Error('RCV3_EMAIL_APPROVAL_REQUIRED');
 const envelope=emailEnvelopeSchema.parse(candidate),sender=emailSender();
 const r=await db.from(EMAIL_TABLE).insert({id:envelope.id,envelope,sender,kind:'notice',status:'pending',created_by:owner!.id});
 if(r.error&&r.error.code!=='23505')throw new Error('RCV3_STORAGE');
 const saved=await db.from(EMAIL_TABLE).select('*').eq('id',envelope.id).maybeSingle();
 if(saved.error||!saved.data)throw new Error('RCV3_STORAGE');
 if(saved.data.kind!=='notice'||emailDigest(saved.data.envelope)!==emailDigest(envelope))throw new Error('RCV3_CONFLICT');
 return saved.data as EmailNotice;
}
export async function reviewEmail(id:string,digest:string,decision:'approve'|'reject',owner:Owner,db=createAdminClient()){
 if(!canManageToolbox(owner))throw new Error('RCV3_EMAIL_APPROVAL_REQUIRED');
 const r=await db.from(EMAIL_TABLE).select('*').eq('id',id).maybeSingle();
 if(r.error||!r.data)throw new Error('RCV3_NOT_FOUND');
 const row=r.data as EmailNotice;
 if(row.kind!=='notice'||row.status!=='pending'||emailDigest(row.envelope)!==digest)throw new Error('RCV3_CONFLICT');
 const result=await db.from(EMAIL_TABLE).update({status:decision==='approve'?'approved':'rejected',approval:decision==='approve'?approveEmail(row.envelope,owner):null,reviewed_by:owner!.id,reviewed_at:new Date().toISOString()}).eq('id',id).eq('status','pending').eq('envelope',JSON.stringify(row.envelope)).select('id').maybeSingle();
 if(result.error)throw new Error('RCV3_STORAGE');
 if(!result.data)throw new Error('RCV3_CONFLICT');
}
// All network sends pass here. Preview must never contact arbitrary real
// customers: explicit test recipients are required even for approved messages.
export async function sendEmailEnvelope(row:EmailNotice,request:typeof fetch=fetch){
 if(process.env.VERCEL_ENV!=='preview'||!emailReady())throw new Error('RCV3_EMAIL_NOT_READY');
 const envelope=emailEnvelopeSchema.parse(row.envelope);
 const allowed=new Set((process.env.RCV3_EMAIL_TEST_RECIPIENTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
 if(envelope.recipients.some(to=>!allowed.has(to.toLowerCase())))throw new Error('RCV3_EMAIL_RECIPIENT_BLOCKED');
 if(row.kind==='notice')requireEmailApproval(envelope,row.approval);
 // Frozen sender prevents changed environment settings altering retry payload.
 z.string().email().parse(row.sender);
 const response=await request('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`rcv3-email/${row.id}`},body:JSON.stringify({from:row.sender,to:envelope.recipients,subject:envelope.subject,text:envelope.text}),signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!response.ok)throw new Error('RCV3_EMAIL_PROVIDER');
 const body=await response.json();
 return z.string().uuid().parse(body.id);
}
export async function deliverNotice(row:EmailNotice,validateCard:(row:EmailNotice)=>Promise<boolean>,db=createAdminClient(),request:typeof fetch=fetch,now=new Date()){
 if(row.status!=='approved'&&row.status!=='sending')return;
 const first=row.first_attempt_at?Date.parse(row.first_attempt_at):now.getTime();
 if(!Number.isFinite(first)||now.getTime()-first>=23*3600000){
  const r=await db.from(EMAIL_TABLE).update({status:'review_required',last_error:'RCV3_EMAIL_RETRY_WINDOW'}).eq('id',row.id).eq('status',row.status);
  if(r.error)throw new Error('RCV3_STORAGE');return;
 }
 if(row.status==='sending'&&row.lease_until&&Date.parse(row.lease_until)>now.getTime())return;
 const token=randomUUID();
 let claim=db.from(EMAIL_TABLE).update({status:'sending',claim_token:token,lease_until:new Date(now.getTime()+60000).toISOString(),first_attempt_at:row.first_attempt_at||now.toISOString()}).eq('id',row.id).eq('status',row.status);
 if(row.claim_token)claim=claim.eq('claim_token',row.claim_token);else claim=claim.is('claim_token',null);
 const got=await claim.select('*').maybeSingle();
 if(got.error)throw new Error('RCV3_STORAGE');if(!got.data)return;
 const current=got.data as EmailNotice;
 let status='accepted',provider_id:string|null=null,last_error:string|null=null;
 try{
  if(current.kind==='notice')requireEmailApproval(current.envelope,current.approval);
  else if(!await validateCard(current)){status='cancelled';}
  if(status!=='cancelled')provider_id=await sendEmailEnvelope(current,request);
 }catch(error){
  last_error=error instanceof Error&&/^RCV3_EMAIL_/.test(error.message)?error.message:'RCV3_EMAIL_PROVIDER';
  status=['RCV3_EMAIL_APPROVAL_REQUIRED','RCV3_EMAIL_RECIPIENT_BLOCKED','RCV3_EMAIL_NOT_READY'].includes(last_error)?'review_required':'sending';
 }
 const result=await db.from(EMAIL_TABLE).update({status,provider_id,last_error}).eq('id',row.id).eq('claim_token',token);
 if(result.error)throw new Error('RCV3_STORAGE');
}
