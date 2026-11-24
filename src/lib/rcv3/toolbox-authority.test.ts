import { expect, it, vi } from 'vitest';
import { canManageToolbox, customerToolState } from './toolbox-authority';
import { writeState, type CloudState, type CloudStore } from './cloud-state';
import { installTool, removeTool } from './toolbox';
const id='11111111-1111-4111-8111-111111111111';
const second='22222222-2222-4222-8222-222222222222';
const original:CloudState={release:'rcv3-1',name:'Customer room',revision:1,connectedProviders:['openai'],selectedProviders:['openai'],secretaryRoomId:null,gmailEnabled:false,design:{backgroundAssetId:null,buttons:[{id,capability:'chat',label:'Chat',x:5,y:5,width:20,height:10,opacity:1}]},appearances:{},bindings:{[id]:'chat'}};
function store(state=original){return {list:vi.fn().mockResolvedValue([{name:'0000000001.txt'}]),read:vi.fn().mockResolvedValue(state),insert:vi.fn().mockResolvedValue(undefined)} as CloudStore;}
it('requires authenticated RC ownership, not room ownership or local demo identity',()=>{
 expect(canManageToolbox({email:'harry2park@gmail.com',mode:'supabase'})).toBe(true);
 expect(canManageToolbox({email:'customer@example.test',mode:'supabase'})).toBe(false);
 expect(canManageToolbox({email:'harry2park@gmail.com',mode:'local'})).toBe(false);
 expect(canManageToolbox(null)).toBe(false);
});
it('rejects direct customer installation without writing storage',async()=>{
 const db=store(),next={...installTool(original,'files',()=>second),revision:2};
 await expect(writeState(db,1,next)).rejects.toThrow('RCV3_TOOL_APPROVAL_REQUIRED');
 expect(db.insert).not.toHaveBeenCalled();
 await expect(writeState(db,1,{...next,approved:true})).rejects.toThrow();
 expect(db.insert).not.toHaveBeenCalled();
});
it('allows RC installation and preserves existing customer arrangement edits',async()=>{
 const db=store(),next={...installTool(original,'files',()=>second),revision:2};
 await expect(writeState(db,1,next,true)).resolves.toMatchObject({revision:2});
 const edited=structuredClone(original);edited.revision=2;edited.design.buttons[0].x=30;
 await expect(writeState(store(),1,edited)).resolves.toMatchObject({revision:2});
});
it('rejects reinstalling a removed tool even when its binding still exists',async()=>{
 const withTool=installTool(original,'files',()=>second),removed=removeTool(withTool,second);
 await expect(writeState(store(removed),1,{...withTool,revision:2})).rejects.toThrow('RCV3_TOOL_APPROVAL_REQUIRED');
});
it('does not turn forged customer storage into an approved advanced tool',()=>{
 const forged=installTool(original,'microphone',()=>second);
 const safe=customerToolState(forged,null);
 expect(safe.design.buttons.map(button=>button.capability)).toEqual(['chat']);
 expect(forged.design.buttons).toHaveLength(2);
});
it('requires exact canonical IDs or protected grant IDs, not a forged duplicate capability',()=>{
 const duplicate=installTool(original,'microphone',()=>second);
 const safe=customerToolState(duplicate,null,[],new Map([[second,'chat']]));
 expect(safe.design.buttons).toEqual([]);
 const grant={buttonId:second,toolId:'microphone' as const,requestId:id,approvedBy:id,approvedAt:'2026-09-22T00:00:00Z'};
 expect(customerToolState(duplicate,null,[grant],new Map([[id,'chat']])).design.buttons).toHaveLength(2);
 const changed=structuredClone(duplicate);changed.design.buttons[1].capability='speaker';
 expect(customerToolState(changed,null,[grant],new Map([[id,'chat']])).design.buttons.map(b=>b.capability)).toEqual(['chat']);
});
