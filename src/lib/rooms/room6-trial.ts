import { createHash } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { COUNTRY_ROOM_PRESETS } from "./countryPresets";
export const TRIAL_MARKER = "rc-room6-trial-v1";
export function trialId(userId: string, kind: "household" | "room") {
  const hex = createHash("sha256").update(`${TRIAL_MARKER}:${kind}:${userId}`).digest("hex").slice(0,32).split("");
  hex[12]="5"; hex[16]="8";
  const s=hex.join(""); return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
export const trialProfileSchema = z.object({
  country: z.string().refine(s=>COUNTRY_ROOM_PRESETS.some(p=>p.id===s)),
  language: z.string().min(2).max(35).refine(s=>{try {return Intl.getCanonicalLocales(s).length===1;}catch{return false;}}),
  timeZone: z.string().max(80).refine(s=>{try{new Intl.DateTimeFormat("en",{timeZone:s});return true;}catch{return false;}}),
  currency: z.string().regex(/^[A-Z]{3}$/),
}).strict();
export type TrialProfile=z.infer<typeof trialProfileSchema>;
export function defaultTrialProfile(country:string,language:string):TrialProfile {
  const p=COUNTRY_ROOM_PRESETS.find(p=>p.id===country)||COUNTRY_ROOM_PRESETS[0];
  const parsed=trialProfileSchema.safeParse({country:p.id,language,timeZone:p.timeZone,currency:p.currencyCode});
  return parsed.success?parsed.data:{country:p.id,language:p.languageTag,timeZone:p.timeZone,currency:p.currencyCode};
}
export function trialReply(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}});}
export async function trialAccess(requireRoom=true){
  if(process.env.VERCEL_ENV!=="preview"&&process.env.NODE_ENV!=="development")throw new Error("TRIAL_NOT_FOUND");
  const user=await getCurrentUser(); if(!user || user.mode!=="supabase")throw new Error("TRIAL_AUTH");
  const db=await createClient(); const roomId=trialId(user.id,"room");
  const result=await db.from("rooms").select("id,room_owner_id,household_id,description,status").eq("id",roomId).eq("room_owner_id",user.id).maybeSingle();
  if(result.error)throw new Error("TRIAL_STORAGE");
  if(result.data && (result.data.household_id!==trialId(user.id,"household")||result.data.description!==TRIAL_MARKER||result.data.status!=="draft"))throw new Error("TRIAL_IDENTITY");
  if(requireRoom&&!result.data)throw new Error("TRIAL_NOT_FOUND");
  const saved=await db.from("profiles").select("default_language,ui_preferences").eq("id",user.id).maybeSingle();
  if(saved.error)throw new Error("TRIAL_PROFILE");
  const prefs=(saved.data?.ui_preferences||{}) as Record<string,unknown>;
  const language=typeof prefs.language==="string"?prefs.language:typeof saved.data?.default_language==="string"?saved.data.default_language:user.defaultLanguage;
  const country=typeof prefs.countryCode==="string"?prefs.countryCode:user.countryCode;
  return {user:{...user,defaultLanguage:language,countryCode:country},db,roomId,room:result.data};
}
export function trialFailure(error:unknown){
  const code=error instanceof Error?error.message:"TRIAL_ERROR";
  if(error instanceof z.ZodError || error instanceof SyntaxError)return trialReply({error:"설정 또는 입력 형식이 올바르지 않습니다.",code:"TRIAL_INPUT"},400);
  const status=code==="TRIAL_AUTH"?401:code==="TRIAL_NOT_FOUND"?404:code==="TRIAL_CONFLICT"?409:503;
  return trialReply({error:code==="TRIAL_AUTH"?"로그인이 필요합니다.":"시험방 요청을 완료하지 못했습니다.",code:code.startsWith("TRIAL_")?code:"TRIAL_ERROR"},status);
}
