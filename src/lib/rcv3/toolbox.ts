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
