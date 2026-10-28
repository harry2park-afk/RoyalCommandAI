import { describe,it,expect,vi } from 'vitest';
import { installTool,removeTool,TOOL_REGISTRY,runTool,type ToolActions } from './toolbox';
import { stateSchema,evolveState,type CloudState } from './cloud-state';
import { portableRoomState } from './portable-copy';
const existing='11111111-1111-4111-8111-111111111111';
const uuid=(n:number)=>`22222222-2222-4222-8222-${String(n).padStart(12,'0')}`;
const original:CloudState={release:'rcv3-1',name:'Owner room',revision:1,connectedProviders:['openai'],selectedProviders:['openai'],secretaryRoomId:null,gmailEnabled:false,design:{backgroundAssetId:null,buttons:[{id:existing,capability:'chat',label:'Private label',x:70,y:40,width:25,height:15,opacity:.7}]},appearances:{},bindings:{[existing]:'chat'}};
describe('registered toolbox installations',()=>{
 it('installs every tool, persists and reloads geometry, retains existing state',()=>{
  let state=original;let n=1;
  for(const tool of TOOL_REGISTRY)state=installTool(state,tool.id,()=>uuid(n++));
  expect(state.design.buttons).toHaveLength(TOOL_REGISTRY.length);
  const stored=evolveState(original,{...state,revision:2},1);
  expect(stateSchema.parse(JSON.parse(JSON.stringify(stored))).design).toEqual(state.design);
  expect(stored.design.buttons[0]).toEqual(original.design.buttons[0]);
  expect(original.design.buttons).toHaveLength(1);
 });
 it('does not duplicate tools, reuse identities, inject a handler or accept unknown capability',()=>{
  const first=installTool(original,'files',()=>uuid(1));
  const nextId=vi.fn(()=>uuid(2));expect(installTool(first,'files',nextId)).toBe(first);expect(nextId).not.toHaveBeenCalled();
  expect(()=>installTool(original,'files',()=>existing)).toThrow('identity');
  expect(()=>installTool(original,'arbitrary-url' as never,()=>uuid(1))).toThrow('UNKNOWN_TOOL');
  const altered={...first,design:{...first.design,buttons:first.design.buttons.map(button=>({...button,endpoint:'https://attacker.invalid'}))}};expect(stateSchema.safeParse(altered).success).toBe(false);
 });
 it('removal preserves old bindings and connection settings; reinstallation gets a new ID',()=>{
  const first=installTool(original,'files',()=>uuid(1));const removed=removeTool(first,uuid(1));
  expect(removed.bindings[uuid(1)]).toBe('files');expect(removed.selectedProviders).toEqual(original.selectedProviders);
  const again=installTool(removed,'files',()=>uuid(2));expect(again.design.buttons.at(-1)?.id).toBe(uuid(2));
  expect(()=>evolveState(first,{...removed,revision:2,bindings:{[existing]:'chat'}},1)).toThrow('RCV3_CAPABILITY_LOCKED');
 });
 it('copies portable tools between rooms without credentials, labels, connections or customer data',()=>{
  let state=original;let n=1;for(const tool of TOOL_REGISTRY)state=installTool(state,tool.id,()=>uuid(n++));
  state={...state,secretaryRoomId:existing,gmailEnabled:true};
  const copy=portableRoomState(state,'New room',i=>`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`);
  expect(copy.secretaryRoomId).toBeNull();expect(copy.gmailEnabled).toBe(false);
  expect(copy.design.buttons.map(b=>b.capability)).toEqual(state.design.buttons.map(b=>b.capability));
  expect(copy.design.buttons.every(b=>!state.design.buttons.some(old=>old.id===b.id))).toBe(true);
  expect(JSON.stringify(copy)).not.toContain('Private label');
 });
 it('calls the exact registered handler and propagates failures',async()=>{
  const actions=Object.fromEntries(TOOL_REGISTRY.map(tool=>[tool.id,vi.fn()])) as unknown as ToolActions;
  for(const tool of TOOL_REGISTRY){await runTool(tool.id,actions);expect(actions[tool.id]).toHaveBeenCalledTimes(1);}
  actions.files=async()=>{throw new Error('not connected');};await expect(runTool('files',actions)).rejects.toThrow('not connected');
 });
});
