import { z } from "zod";
import { session, input, reply, failure } from "@/lib/rcv3/access";
import { customerPhoneAccountStatus, saveCustomerPhoneAccount, bindCustomerPhone } from "@/lib/rcv3/customer-phone-account";
export const maxDuration = 60;
export async function GET() {
  try { const { user } = await session(); return reply(await customerPhoneAccountStatus(user.id)); } catch (e) { return failure(e); }
}
export async function PUT(request: Request) {
  try { const { user } = await session(); return reply(await saveCustomerPhoneAccount(user.id, await input(request, 2000))); } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const { user } = await session();
    const body = z.object({ roomId: z.uuid(), numberSid: z.string().regex(/^PN[a-f0-9]{32}$/i), consent: z.literal(true) }).strict().parse(await input(request, 2000));
    return reply(await bindCustomerPhone(user.id, body.roomId, body.numberSid, body.consent));
  } catch (e) { return failure(e); }
}
