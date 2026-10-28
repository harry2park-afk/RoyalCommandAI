import {z} from 'zod';
import {session,access,input,reply,failure,stableId,RCV3_MARKER} from '@/lib/rcv3/access';
import {orderLedger,updateOrderSnapshot,type LedgerOrder} from '@/lib/rcv3/checkout-ledger';
import {canManageToolbox,customerToolState,customerToolCapabilities} from '@/lib/rcv3/toolbox-authority';
import {cloudStore,readState,writeState} from '@/lib/rcv3/cloud-state';
import {installTool} from '@/lib/rcv3/toolbox';
import {TOOL_IDS,createToolButton} from '../../../../../rcv3/tool-registry.mjs';
export async function GET(request:Request){
 try{
  const {user}=await session(),ledger=orderLedger();
  if(canManageToolbox(user)){
   const result=await ledger.db.from('rcv3_preview_orders').select('*').not('snapshot->toolRequests','is',null).order('created_at',{ascending:false}).limit(100);
   if(result.error)throw new Error('RCV3_STORAGE');
   return reply({requests:((result.data??[]) as LedgerOrder[]).flatMap(row=>(row.snapshot.toolRequests??[]).map(item=>({...item,roomId:row.room_id,roomName:row.snapshot.draft.name}))) });
  }
  const roomId=z.string().uuid().parse(new URL(request.url).searchParams.get('room'));
  const row=await ledger.one('room_id',roomId,user.id);
  if(!row)throw new Error('RCV3_NOT_FOUND');
  return reply({requests:(row.snapshot.toolRequests??[]).map(({id,text,at,status})=>({id,text,at,status}))});
 }catch(error){return failure(error);}
}
export async function POST(request:Request){
 try{
  const body=z.object({roomId:z.string().uuid(),requestId:z.string().uuid(),text:z.string().trim().min(5).max(1500)}).strict().parse(await input(request,4000));
  const {user}=await access(body.roomId,{allowUnpaidRead:true});
  const ledger=orderLedger(),row=await ledger.one('room_id',body.roomId,user.id);
  if(!row)throw new Error('RCV3_NOT_FOUND');
  const requests=row.snapshot.toolRequests??[];
  const existing=requests.find(item=>item.id===body.requestId);
  if(existing){if(existing.text!==body.text)throw new Error('RCV3_CONFLICT');return reply({status:existing.status});}
  if(requests.length>=100 || requests.filter(item=>item.status==='pending').length>=10)throw new Error('RCV3_LIMIT');
  await updateOrderSnapshot(row,{...row.snapshot,toolRequests:[...requests,{id:body.requestId,text:body.text,at:new Date().toISOString(),status:'pending'}]},ledger);
  return reply({status:'pending'});
 }catch(error){return failure(error);}
}
export async function PUT(request:Request){
 try{
  const {user}=await session();
  if(!canManageToolbox(user))throw new Error('RCV3_TOOL_APPROVAL_REQUIRED');
  const body=z.object({roomId:z.string().uuid(),requestId:z.string().uuid(),decision:z.enum(['approve','reject']),toolId:z.enum(TOOL_IDS).optional()}).strict().parse(await input(request,2000));
  const ledger=orderLedger();let row=await ledger.one('room_id',body.roomId);
  if(!row?.activated_at)throw new Error('RCV3_NOT_FOUND');
  const target=await ledger.db.from('rooms').select('id').eq('id',row.room_id).eq('room_owner_id',row.owner_id).eq('description',RCV3_MARKER).eq('status','draft').maybeSingle();
  if(target.error||!target.data)throw new Error('RCV3_NOT_FOUND');
  const found=(row.snapshot.toolRequests??[]).find(item=>item.id===body.requestId);
  if(!found)throw new Error('RCV3_NOT_FOUND');
  if(found.status==='rejected'&&body.decision==='reject')return reply({status:'rejected'});
  if(found.status==='rejected' || (found.status==='approved'&&(body.decision!=='approve'||body.toolId!==found.toolId)))throw new Error('RCV3_CONFLICT');
  if(body.decision==='approve'&&(!body.toolId||body.toolId==='toolbox'))throw new Error('RCV3_TOOL_APPROVAL_REQUIRED');
  const store=cloudStore(ledger.db,row.owner_id,row.room_id),raw=await readState(store);
  if(!raw)throw new Error('RCV3_NOT_FOUND');
  const baseIds=new Map(customerToolCapabilities(row.snapshot.draft).map(tool=>[stableId(row!.room_id,tool),tool]));
  const current=customerToolState(raw,row.snapshot.draft,row.snapshot.toolGrants,baseIds);
  if(found.status==='pending'){
   const at=new Date().toISOString(),toolId=body.toolId;
   const next=body.decision==='approve'?installTool(current,toolId!,()=>stableId(row!.room_id,`tool-request:${found.id}`)):current;
   const button=next.design.buttons.find(item=>item.capability===toolId);
   row=await updateOrderSnapshot(row,{...row.snapshot,
    toolRequests:row.snapshot.toolRequests!.map(item=>item.id===found.id?{...item,status:body.decision==='approve'?'approved':'rejected',...(toolId?{toolId}:{}),reviewedBy:user.id,reviewedAt:at}:item),
    toolGrants:body.decision==='approve'?[...(row.snapshot.toolGrants??[]),{buttonId:button!.id,toolId:toolId!,requestId:found.id,approvedBy:user.id,approvedAt:at}]:(row.snapshot.toolGrants??[])},ledger);
  }
  if(body.decision==='approve'){
   const grant=row.snapshot.toolGrants!.find(item=>item.requestId===found.id)!;
   const latest=await readState(store);if(!latest)throw new Error('RCV3_NOT_FOUND');
   const visible=customerToolState(latest,row.snapshot.draft,row.snapshot.toolGrants,baseIds);
   const existing=visible.design.buttons.find(button=>button.id===grant.buttonId&&button.capability===grant.toolId);
   if(latest.bindings[grant.buttonId]&&latest.bindings[grant.buttonId]!==grant.toolId)throw new Error('RCV3_CONFLICT');
   const next=existing?visible:{...visible,design:{...visible.design,buttons:[...visible.design.buttons,createToolButton(grant.toolId,grant.buttonId,visible.design.buttons.length)]},bindings:{...visible.bindings,[grant.buttonId]:grant.toolId}};
   if(next!==visible)await writeState(store,latest.revision,{...next,revision:latest.revision+1},true);
  }
  return reply({status:body.decision==='approve'?'approved':'rejected'});
 }catch(error){return failure(error);}
}
