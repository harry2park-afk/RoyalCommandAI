import { z } from "zod";
import { session, reply, failure } from "@/lib/rcv3/access";
import { getCustomerPhoneRecommendation } from "@/lib/rcv3/customer-phone";

const querySchema = z.object({ country: z.string().regex(/^[A-Z]{2}$/) }).strict();
export async function GET(request: Request) {
  try {
    await session();
    const { country } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return reply(getCustomerPhoneRecommendation(country));
  } catch (error) { return failure(error); }
}
