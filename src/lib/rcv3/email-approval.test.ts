import { describe, expect, it } from 'vitest';
import { approveEmail, requireEmailApproval, type EmailEnvelope } from './email-approval';
const message: EmailEnvelope = { id:'ebc58f54-f614-4b03-a51a-363601786293',recipients:['customer@example.com'],subject:'RC account notice',text:'Please review your account.' };
const owner = {id:'owner',email:'harry2park@gmail.com',mode:'supabase'};
describe('RC exact-message email approval',()=>{
 it('requires the authenticated RC owner',()=>{
  expect(()=>approveEmail(message,{...owner,email:'customer@example.com'})).toThrow('RCV3_EMAIL_APPROVAL_REQUIRED');
  expect(()=>approveEmail(message,{...owner,mode:'demo'})).toThrow('RCV3_EMAIL_APPROVAL_REQUIRED');
 });
 it('blocks unapproved messages and allows the exact approved envelope',()=>{
  expect(()=>requireEmailApproval(message,null)).toThrow('RCV3_EMAIL_APPROVAL_REQUIRED');
  expect(()=>requireEmailApproval(message,approveEmail(message,owner))).not.toThrow();
 });
 it.each(['recipients','subject','text','id'] as const)('invalidates approval when %s changes',key=>{
  const changed={...message,[key]:key==='recipients'?['other@example.com']:key==='id'?'8a1b263b-6221-4882-92ae-a046c003be23':'Changed'};
  expect(()=>requireEmailApproval(changed,approveEmail(message,owner))).toThrow('RCV3_EMAIL_APPROVAL_REQUIRED');
 });
 it('rejects malformed approvals and header injection',()=>{
  expect(()=>requireEmailApproval(message,{digest:'bad',approvedBy:'owner',approvedAt:new Date().toISOString()})).toThrow('RCV3_EMAIL_APPROVAL_REQUIRED');
  expect(()=>approveEmail({...message,subject:'RC\r\nBcc: other@example.com'},owner)).toThrow();
 });
});
