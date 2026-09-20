import { z } from "zod";
import { session, input, reply, failure } from "@/lib/rcv3/access";
import { PERSONAL_AI_PROVIDERS, customerAIStatus, saveCustomerAIKey, revokeCustomerAIKey } from "@/lib/rcv3/customer-ai";
export const maxDuration = 40;
export async function GET() {
  try { const { user } = await session(); return reply(await customerAIStatus(user.id)); }
  catch (error) { return failure(error); }
}
function requireOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new Error("RCV3_ORIGIN");
}
export async function PUT(request: Request) {
  try {
    requireOrigin(request);
    const { user } = await session();
    const data = z.object({ provider: z.enum(PERSONAL_AI_PROVIDERS), apiKey: z.string().max(2048) }).strict().parse(await input(request, 4096));
    return reply(await saveCustomerAIKey(user.id, data.provider, data.apiKey));
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    requireOrigin(request);
    const { user } = await session();
    const data = z.object({ provider: z.enum(PERSONAL_AI_PROVIDERS) }).strict().parse(await input(request, 512));
    await revokeCustomerAIKey(user.id, data.provider); return reply({ revoked: true });
  } catch (error) { return failure(error); }
}
