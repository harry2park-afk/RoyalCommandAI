import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:vi.fn(()=>{throw new Error('Unexpected real database');})}));
import {approveEmail} from './email-approval';
import {deliverNotice,sendEmailEnvelope,type EmailNotice} from './email-outbox';
const owner={id:'owner',email:'harry2park@gmail.com',mode:'supabase'};
const now=new Date('2026-09-22T00:00:00Z');
const providerId='ccf1c919-a2e9-4124-a57e-d90efb897eb7';
function notice():EmailNotice{
 const envelope={id:'ab8e62b9-420f-435f-b739-bd196ac4c839',recipients:['fixture@example.test'],subject:'Account notice',text:'Your approved notice.'};
 return {id:envelope.id,envelope,sender:'frozen-sender@example.test',kind:'notice',order_id:null,approval:approveEmail(envelope,owner),status:'approved',created_at:now.toISOString(),first_attempt_at:null,lease_until:null,claim_token:null,provider_id:null};
}
function database(initial:EmailNotice){
 const row=structuredClone(initial);
 const db={from:()=>{
  let patch:Partial<EmailNotice>={};const filters:Array<()=>boolean>=[];
  const execute=()=>{if(!filters.every(check=>check()))return {data:null,error:null};Object.assign(row,patch);return {data:structuredClone(row),error:null};};
  const query={
   update:(next:Partial<EmailNotice>)=>{patch=next;return query;},
   eq:(key:keyof EmailNotice,value:unknown)=>{filters.push(()=>row[key]===value);return query;},
   is:(key:keyof EmailNotice,value:unknown)=>{filters.push(()=>(row[key]??null)===value);return query;},
   select:()=>query,maybeSingle:async()=>execute(),
   then:(resolve:(value:ReturnType<typeof execute>)=>unknown)=>Promise.resolve(execute()).then(resolve),
  };return query;
 }};
 return {row,db:db as unknown as Parameters<typeof deliverNotice>[2]};
}
function transport(){return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({id:providerId}),{status:200}));}
beforeEach(()=>{
 vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('RCV3_EMAIL_ENABLED','true');vi.stubEnv('RESEND_API_KEY','test-fixture-not-a-secret');vi.stubEnv('RCV3_EMAIL_FROM','new-config-sender@example.test');vi.stubEnv('RCV3_EMAIL_TEST_RECIPIENTS','fixture@example.test');
});
afterEach(()=>vi.unstubAllEnvs());
describe('protected preview email transport',()=>{
 it('never contacts the provider without exact approval',async()=>{
  const row=notice(),request=transport();row.approval=null;
  await expect(sendEmailEnvelope(row,request)).rejects.toThrow('RCV3_EMAIL_APPROVAL_REQUIRED');expect(request).not.toHaveBeenCalled();
 });
 it('blocks text changed after approval',async()=>{
  const row=notice(),request=transport();row.envelope.text='Unapproved replacement';
  await expect(sendEmailEnvelope(row,request)).rejects.toThrow('RCV3_EMAIL_APPROVAL_REQUIRED');expect(request).not.toHaveBeenCalled();
 });
 it('blocks approved recipients outside the preview allowlist',async()=>{
  const row=notice(),request=transport();row.envelope.recipients=['real-customer@example.test'];row.approval=approveEmail(row.envelope,owner);
  await expect(sendEmailEnvelope(row,request)).rejects.toThrow('RCV3_EMAIL_RECIPIENT_BLOCKED');expect(request).not.toHaveBeenCalled();
 });
 it('returns provider acceptance and sends the frozen sender with a stable key',async()=>{
  const row=notice(),request=transport();expect(await sendEmailEnvelope(row,request)).toBe(providerId);
  expect(request).toHaveBeenCalledTimes(1);
  const [url,options]=request.mock.calls[0];expect(url).toBe('https://api.resend.com/emails');
  expect(options?.headers).toMatchObject({'Idempotency-Key':`rcv3-email/${row.id}`});
  expect(JSON.parse(options?.body as string)).toEqual({from:row.sender,to:row.envelope.recipients,subject:row.envelope.subject,text:row.envelope.text});
 });
});
describe('email outbox claim and retry safety',()=>{
 it('claims once across concurrent workers and does not resend accepted notices',async()=>{
  const initial=notice(),{row,db}=database(initial),request=transport(),validate=vi.fn().mockResolvedValue(true);
  await Promise.all([deliverNotice(structuredClone(initial),validate,db,request,now),deliverNotice(structuredClone(initial),validate,db,request,now)]);
  expect(request).toHaveBeenCalledTimes(1);expect(row.status).toBe('accepted');expect(row.provider_id).toBe(providerId);expect(row.first_attempt_at).toBe(now.toISOString());
  await deliverNotice(structuredClone(row),validate,db,request,new Date(now.getTime()+120000));
  expect(request).toHaveBeenCalledTimes(1);expect(validate).not.toHaveBeenCalled();
 });
 it('moves an unapproved stored notice to review without sending',async()=>{
  const initial=notice();initial.approval=null;const {row,db}=database(initial),request=transport();
  await deliverNotice(initial,vi.fn(),db,request,now);
  expect(row.status).toBe('review_required');expect(request).not.toHaveBeenCalled();
 });
 it('requires manual review at the 23-hour boundary instead of generating a new attempt',async()=>{
  const initial=notice();initial.status='sending';initial.first_attempt_at=new Date(now.getTime()-23*3600000).toISOString();initial.lease_until=new Date(now.getTime()-1000).toISOString();initial.claim_token='old-token';
  const {row,db}=database(initial),request=transport();await deliverNotice(initial,vi.fn(),db,request,now);
  expect(row.status).toBe('review_required');expect(row.first_attempt_at).toBe(initial.first_attempt_at);expect(request).not.toHaveBeenCalled();
 });
 it('does not reclaim an unexpired sending lease',async()=>{
  const initial=notice();initial.status='sending';initial.first_attempt_at=now.toISOString();initial.lease_until=new Date(now.getTime()+60000).toISOString();initial.claim_token='active-token';
  const {row,db}=database(initial),request=transport();await deliverNotice(initial,vi.fn(),db,request,now);
  expect(row.claim_token).toBe('active-token');expect(request).not.toHaveBeenCalled();
 });
});
