import type { CloudState } from './cloud-state';
import type { RoomDraftInput } from './room-draft';
import type {ToolGrant} from './tool-approval-types';

// Same authenticated owner accounts as the existing RC developer gateway.
// Room ownership and client-supplied approval flags never grant RC authority.
const RC_OWNERS = new Set(['harry2park@gmail.com', 'harry@royalcommand.ai']);
export function canManageToolbox(user: { email: string; mode: string } | null) {
  return user?.mode === 'supabase' && RC_OWNERS.has(user.email.trim().toLowerCase());
}
// Customer storage is not an approval ledger. Only the protected RC order
// supplies the initial feature set. Extra tools need an RC-approved release.
export function customerToolCapabilities(draft: RoomDraftInput | null): CloudState['design']['buttons'][number]['capability'][] {
  return [...(!draft || draft.providers.length ? ['chat' as const] : []), 'files', ...(!draft || draft.secretary ? ['secretary' as const] : [])];
}
export function customerToolState(state: CloudState, draft: RoomDraftInput | null, grants:ToolGrant[]=[], baseIds?:Map<string,string>): CloudState {
  const allowed = new Set(customerToolCapabilities(draft));
  const approved=new Map(grants.map(grant=>[grant.buttonId,grant.toolId]));
  return {...state, design: {...state.design, buttons: state.design.buttons.filter(button => (allowed.has(button.capability)&&(!baseIds||baseIds.get(button.id)===button.capability)) || approved.get(button.id)===button.capability)}};
}
export function requireToolInstallationAuthority(previous: CloudState, next: CloudState, authorized: boolean) {
  if (authorized) return;
  const existing = new Map(previous.design.buttons.map(button => [button.id, button.capability]));
  if (next.design.buttons.some(button => existing.get(button.id) !== button.capability) ||
      Object.entries(next.bindings).some(([id, value]) => previous.bindings[id] !== value)) {
    throw new Error('RCV3_TOOL_APPROVAL_REQUIRED');
  }
}
