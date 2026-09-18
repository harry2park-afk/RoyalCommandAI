import { z } from "zod";
import {access,input,reply,failure} from "@/lib/rcv3/access";
import {reserve} from "@/lib/rcv3/execution";
import {AI_PROVIDER_IDS} from "@/lib/ai/types";
import {getConnector,isProviderConfigured} from "@/lib/ai/connectors";
export const maxDuration=120;
export async function POST(request:Request){try{
 const d=z.object({roomId:z.string().uuid(),requestId:z.string().uuid(),provider:z.enum(AI_PROVIDER_IDS)}).strict().parse(await input(request,2000));
 const a=await access(d.roomId);if(!isProviderConfigured(d.provider))throw new Error("RCV3_AI_NOT_CONNECTED");
 await reserve(a,d.requestId,"connect");
 const r=await getConnector(d.provider).complete({messages:[{role:"user",content:"Reply with OK only."}],maxTokens:32});
 if(r.error||!r.content.trim())throw new Error("RCV3_AI_RESPONSE");
 return reply({provider:d.provider,verified:true});
}catch(e){return failure(e);}}
