import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {getAvailableProviderIds,getConnector} from "@/lib/ai/connectors";
import {findHelp,accountHelpLanguage} from "@/lib/locale/help-catalog";
export const maxDuration=30;
const cache=new Map<string,{text:string;until:number}>();
const limits=new Map<string,{count:number;until:number}>();
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request:Request) {
 try{
  const user=await getCurrentUser();if(!user)return reply({code:"HELP_AUTH"},401);
  const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return reply({code:"HELP_ORIGIN"},403);
  const raw=await request.text();if(raw.length>400)return reply({code:"HELP_SIZE"},413);
  const {key}=z.object({key:z.string().max(100)}).strict().parse(JSON.parse(raw));
  const help=findHelp(key);if(!help)return reply({code:"HELP_NOT_FOUND"},404);
  let selected=user.defaultLanguage;
  if(user.mode==="supabase"){
   const db=await createClient();const r=await db.from("profiles").select("default_language").eq("id",user.id).maybeSingle();
   if(r.error)return reply({code:"HELP_PROFILE"},503);
   selected=r.data?.default_language||selected;
  }
  const language=accountHelpLanguage(selected),base=language.split("-")[0];
  if(base==="en")return reply({text:help.en,language});
  if(base==="ko"&&help.ko)return reply({text:help.ko,language});
  const now=Date.now(),cacheKey=JSON.stringify([key,help.en,language]);
  const hit=cache.get(cacheKey);if(hit&&hit.until>now)return reply({text:hit.text,language});
  const limit=limits.get(user.id);if(limit&&limit.until>now&&limit.count>=20)return reply({code:"HELP_LIMIT"},429);
  if(limits.size>=1000){for(const [id,value]of limits)if(value.until<=now)limits.delete(id);if(limits.size>=1000&&!limits.has(user.id))return reply({code:"HELP_LIMIT"},429);}
  limits.set(user.id,{count:limit&&limit.until>now?limit.count+1:1,until:limit&&limit.until>now?limit.until:now+60000});
  const ids=getAvailableProviderIds(),provider=ids.includes("openai")?"openai":ids[0];
  if(!provider)return reply({code:"HELP_UNAVAILABLE"},503);
  const result=await getConnector(provider).complete({messages:[{role:"system",content:`Translate the following public interface explanation into ${language}. Use simple language. Return only the translation. Do not add advice or change facts.`},{role:"user",content:help.en}],maxTokens:700,temperature:0});
  if(result.error||!result.content.trim()||result.content.length>4000)return reply({code:"HELP_FAILED"},502);
  if(cache.size>=500)cache.delete(cache.keys().next().value!);
  cache.set(cacheKey,{text:result.content.trim(),until:now+3600000});
  return reply({text:result.content.trim(),language});
 }catch{return reply({code:"HELP_FAILED"},400);}
}
