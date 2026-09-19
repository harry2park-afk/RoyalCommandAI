import { z } from "zod";
import { cloudStore } from "./cloud-state";
import type { access } from "./access";
import { stableId } from "./access";
import { getServerDomainRuntimeContext } from "@/lib/runtime/serverDomainContext";
import { isDomainFeatureReady } from "@/config/countryResolver";
export const scopeSchema = z.enum(["chat", "secretary"]);
export const turnSchema = z.object({ requestId: z.string().uuid(), scope: scopeSchema, provider: z.string(), prompt: z.string().max(12000), answer: z.string().max(50000), at: z.string(), durationMs: z.number().nonnegative() }).strict();
export type Turn = z.infer<typeof turnSchema>;
export async function reserve(a: Awaited<ReturnType<typeof access>>, requestId: string, kind: string) {
  const runtime = await getServerDomainRuntimeContext();
  if (!runtime || !isDomainFeatureReady(runtime, "ai")) throw new Error("RCV3_UNAVAILABLE");
  const budget = cloudStore(a.db, a.user.id, stableId(a.user.id, "account-budget"));
  // Account-wide limits, unaffected by cloning rooms. Every attempt reserves once.
  await budget.insert(`requests/${kind}-${requestId}.txt`, { at: new Date().toISOString() });
  const day = new Date().toISOString().slice(0,10);
  for(let attempt=0;attempt<32;attempt++) {
    const slots=await budget.list(`budget/${day}`,301);
    if(slots.length>=300)throw new Error("RCV3_LIMIT");
    try { await budget.insert(`budget/${day}/${String(slots.length).padStart(4,"0")}.txt`,{requestId,kind}); return; }
    catch(e){if(!(e instanceof Error)||e.message!=="RCV3_CONFLICT")throw e;}
  }
  throw new Error("RCV3_LIMIT");
}
export async function history(a: Awaited<ReturnType<typeof access>>, scope: z.infer<typeof scopeSchema>) {
  const files = await a.store.list(`turns/${scope}`, 30);
  return (await Promise.all(files.map(f => a.store.read(`turns/${scope}/${f.name}`)))).map(t => turnSchema.parse(t)).sort((a,b) => a.at.localeCompare(b.at));
}
