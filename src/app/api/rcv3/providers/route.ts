import { requirePaidService } from "@/lib/rcv3/checkout-ledger";
import { z } from "zod";
import {access,input,reply,failure} from "@/lib/rcv3/access";
import {reserve} from "@/lib/rcv3/execution";
import {AI_PROVIDER_IDS} from "@/lib/ai/types";
import {resolveCustomerAI} from "@/lib/rcv3/customer-ai";
export const maxDuration=120;
export async function POST(request:Request){try{
 const d=z.object({roomId:z.string().uuid(),requestId:z.string().uuid(),provider:z.enum(AI_PROVIDER_IDS)}).strict().parse(await input(request,2000));
 const a=await access(d.roomId);requirePaidService(a.entitlement ?? null,`ai:${d.provider}`);
 const connector=await resolveCustomerAI(a.user.id,d.provider,a.entitlement?.onboarding?.aiSources[d.provider] || "platform");
 await reserve(a,d.requestId,"connect");
 const r=await connector.complete({messages:[{role:"user",content:"Reply with OK only."}],maxTokens:32});
 if(r.error||!r.content.trim())throw new Error("RCV3_AI_RESPONSE");
 return reply({provider:d.provider,verified:true});
}catch(e){return failure(e);}}
