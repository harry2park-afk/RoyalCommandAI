import { z } from "zod";
import { session, input, reply, failure } from "@/lib/rcv3/access";
import { openPreviewTokenRoom, previewTokenAccount } from "@/lib/rcv3/preview-tokens";
export const maxDuration=60;
export async function GET() {
  try { const {user}=await session();return reply(await previewTokenAccount(user.id)); }
  catch(error){return failure(error);}
}
export async function POST(request:Request) {
  try {
    const {user,db}=await session();
    const body=z.object({draftId:z.string().uuid(),expectedRevision:z.number().int().nonnegative(),signature:z.string().trim().min(2).max(160),termsConsent:z.literal(true)}).strict().parse(await input(request,1000));
    return reply(await openPreviewTokenRoom(user.id,db,body.draftId,body.expectedRevision,body.signature));
  } catch(error){return failure(error);}
}
