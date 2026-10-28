import { TOOL_REGISTRY, getTool, createToolButton } from '../../../rcv3/tool-registry.mjs';
import type { CloudState } from './cloud-state';
export { TOOL_REGISTRY, getTool };
export type ToolId = typeof TOOL_REGISTRY[number]['id'];

// Adding the same tool twice is idempotent, including an immediate double click.
// Preserve all existing room settings, old bindings and installed geometry.
export function installTool(state: CloudState, toolId: ToolId, newId: () => string): CloudState {
  getTool(toolId);
  if (state.design.buttons.some(button => button.capability === toolId)) return state;
  if (state.design.buttons.length >= 32) throw new Error('This room has 32 buttons. Remove one before adding another.');
  const button = createToolButton(toolId, newId(), state.design.buttons.length);
  if (state.bindings[button.id]) throw new Error('Button identity already exists. Try again.');
  return {...state,design:{...state.design,buttons:[...state.design.buttons,button]},bindings:{...state.bindings,[button.id]:toolId}};
}
export function placeTool(state: CloudState, toolId: ToolId, newId: () => string, point: {x:number;y:number}): CloudState {
  const before=new Set(state.design.buttons.map(button=>button.id));
  const installed=installTool(state,toolId,newId);
  if(installed===state)return state;
  const placed=installed.design.buttons.find(button=>!before.has(button.id));
  if(!placed)throw new Error('Tool placement failed. Try again.');
  const px=Number.isFinite(point.x)?Math.max(0,Math.min(100,point.x)):50;
  const py=Number.isFinite(point.y)?Math.max(0,Math.min(100,point.y)):50;
  const x=Math.max(0,Math.min(100-placed.width,px-placed.width/2));
  const y=Math.max(0,Math.min(100-placed.height,py-placed.height/2));
  return {...installed,design:{...installed.design,buttons:installed.design.buttons.map(button=>button.id===placed.id?{...button,x,y}:button)}};
}
export function removeTool(state: CloudState, id: string): CloudState {
  // Removal affects only the visible installation. Lifetime bindings, customer
  // files, subscriptions and credentials remain untouched.
  return {...state,design:{...state.design,buttons:state.design.buttons.filter(button=>button.id!==id)}};
}
export type ToolActions = Record<ToolId, () => void | Promise<void>>;
export async function runTool(id: ToolId, actions: ToolActions) {
  getTool(id);
  await actions[id]();
}
