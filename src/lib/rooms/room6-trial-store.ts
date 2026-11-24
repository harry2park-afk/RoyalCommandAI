import {z} from "zod";
import type {createClient} from "@/lib/supabase/server";
import {ROOM6_BUCKET,room6Prefix} from "./room6-storage";
import {trialProfileSchema,type TrialProfile} from "./room6-trial";
import {AI_PROVIDER_IDS} from "@/lib/ai/types";
type DB=Awaited<ReturnType<typeof createClient>>;
export const turnSchema=z.object({requestId:z.string().uuid(),provider:z.enum(AI_PROVIDER_IDS),prompt:z.string().min(1).max(4000),answer:z.string().max(50000),at:z.string(),error:z.boolean()}).strict();
export type TrialTurn=z.infer<typeof turnSchema>;
export function trialStore(db:DB,user:string,room:string){
 const b=db.storage.from(ROOM6_BUCKET),root=room6Prefix(user,room).replace("rc-room6-config-v1","rc-room6-trial-v1");
 return {
  async list(folder:string,limit=100){const r=await b.list(`${root}/${folder}`,{limit,sortBy:{column:"name",order:"desc"}});if(r.error)throw new Error("TRIAL_STORAGE");return r.data||[];},
  async read(path:string){const r=await b.download(`${root}/${path}`);if(r.error||!r.data||r.data.size>200000)throw new Error("TRIAL_STORAGE");return JSON.parse(await r.data.text());},
  async insert(path:string,value:unknown){const r=await b.upload(`${root}/${path}`,JSON.stringify(value),{upsert:false,contentType:"text/plain",cacheControl:"0"});if(r.error)throw new Error(/duplicate|already exists/i.test(r.error.message)?"TRIAL_CONFLICT":"TRIAL_STORAGE");},
 };
}
export async function readTrialProfile(store:ReturnType<typeof trialStore>,fallback:TrialProfile){
 const files=await store.list("profile",1);if(!files.length)return {revision:0,profile:fallback};
 if(!/^\d{10}\.txt$/.test(files[0].name))throw new Error("TRIAL_STORAGE");
 return {revision:Number(files[0].name.slice(0,10)),profile:trialProfileSchema.parse(await store.read(`profile/${files[0].name}`))};
}
