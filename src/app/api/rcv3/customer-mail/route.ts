import { z } from "zod";
import { session, stableId, input, reply, failure } from "@/lib/rcv3/access";
import { cloudStore } from "@/lib/rcv3/cloud-state";
import { readDraftRegistry } from "@/lib/rcv3/room-draft";
import { createOAuthState, googleAuthUrl } from "@/lib/google-workspace";
import { customerMailStatus } from "@/lib/rcv3/customer-mail";
export const maxDuration = 60;
export async function GET() {
  try { const {user} = await session(); return reply(await customerMailStatus(user.id)); }
  catch(e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const {user, db} = await session();
    const {draftId} = z.object({draftId:z.string().uuid()}).strict().parse(await input(request,1000));
    const registry = await readDraftRegistry(cloudStore(db,user.id,stableId(user.id,"room-creation-drafts")));
    const draft = registry.drafts.find(d => d.id === draftId);
    if (!draft?.input.secretary || !draft.input.onboarding?.emailEnabled) throw new Error("RCV3_FORM_REQUIRED");
    return reply({url:googleAuthUrl(createOAuthState(user.id, `/rcv3/create?draft=${draftId}`))});
  } catch(e) { return failure(e); }
}
