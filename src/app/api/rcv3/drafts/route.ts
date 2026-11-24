import { session, stableId, input, reply, failure } from "@/lib/rcv3/access";
import { cloudStore } from "@/lib/rcv3/cloud-state";
import { cancelRoomDraft, readDraftRegistry, saveRoomDraft } from "@/lib/rcv3/room-draft";

async function accountStore() {
  const { user, db } = await session();
  // Account-derived namespace, not a client-supplied room/owner identifier.
  // Existing Storage RLS restricts the first path segment to auth.uid().
  return cloudStore(db, user.id, stableId(user.id, "room-creation-drafts"));
}
export async function GET() {
  try { return reply(await readDraftRegistry(await accountStore())); }
  catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try { return reply(await saveRoomDraft(await accountStore(), await input(request, 24000))); }
  catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try { return reply(await cancelRoomDraft(await accountStore(), await input(request, 1000))); }
  catch (error) { return failure(error); }
}
