import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const EVENTS = new Set(["call_ended", "call_analyzed"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Json = Record<string, unknown>;
const obj=(v:unknown):Json=>v&&typeof v==="object"&&!Array.isArray(v)?v as Json:{};
const str=(v:unknown)=>typeof v==="string"&&v.trim()?v.trim():null;
const tel=(v:unknown)=>str(v)?.replace(/[^+\d]/g,"")??null;
export function verifyRetellWebhook(raw:string,signature:string|null,key:string,now=Date.now()){
 const normalizedSignature=signature?.trim();
 const normalizedKey=key.trim();
 if(!normalizedSignature||!normalizedKey)return false;
 const f=Object.fromEntries(normalizedSignature.split(",").map(p=>{const [k,...v]=p.trim().split("=");return[k,v.join("=").trim()]}));
 if(!f.v||!f.d||!/^\d+$/.test(f.v)||!/^[a-f0-9]{64}$/i.test(f.d)||Math.abs(now-Number(f.v))>300000)return false;
 const expected=createHmac("sha256",normalizedKey).update(raw+f.v).digest("hex");
 return timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(f.d,"hex"));
}
async function roomFor(call:Json){
 const meta=obj(call.metadata),vars=obj(call.retell_llm_dynamic_variables);
 const explicit=str(meta.room_id)??str(meta.roomId)??str(vars.room_id)??str(vars.roomId);
 const db=createAdminClient();
 if(explicit&&UUID.test(explicit)){const {data}=await db.from("rooms").select("id").eq("id",explicit).maybeSingle();return data?.id??null;}
 const called=tel(call.to_number);
 if(called){
  const {data,error}=await db.from("service_instances").select("room_id,provider_binding").eq("service_class","call_agency").eq("status","active");
  if(error)throw error;
  const matches=(data??[]).filter(row=>{const b=obj(row.provider_binding);return[b.phone_e164,b.to_number,b.number,b.did].some(v=>tel(v)===called)});
  if(matches.length===1&&UUID.test(matches[0].room_id))return matches[0].room_id;
 }
 const fallback=process.env.RETELL_DEFAULT_ROOM_ID?.trim();
 if(fallback&&UUID.test(fallback)){const {data}=await db.from("rooms").select("id").eq("id",fallback).maybeSingle();return data?.id??null;}
 return null;
}
export async function POST(request:NextRequest){
 const started=Date.now();let event="unknown",callId="unknown";
 try{
  const raw=await request.text(),key=process.env.RETELL_API_KEY_PREVIEW||process.env.RETELL_API_KEY;
  if(!key||!verifyRetellWebhook(raw,request.headers.get("x-retell-signature"),key)){
   console.warn(JSON.stringify({level:"warn",msg:"retell_webhook_rejected",reason:key?"invalid_signature":"missing_key"}));
   return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  const body=obj(JSON.parse(raw));event=str(body.event)??"unknown";
  if(!EVENTS.has(event))return NextResponse.json({received:true,ignored:true});
  const call=obj(body.call);callId=str(call.call_id)??"";
  if(!callId)return NextResponse.json({error:"Missing call id"},{status:400});
  const roomId=await roomFor(call);
  if(!roomId){console.error(JSON.stringify({level:"error",msg:"retell_webhook_room_unresolved",event,callId}));return NextResponse.json({error:"Room mapping not found"},{status:422});}
  const db=createAdminClient(),dedupKey=`${callId}:${event}`;
  const {data:prior,error:lookupError}=await db.from("activity_events").select("id").eq("room_id",roomId).eq("event_type","ai_secretary.retell_post_call").contains("payload",{dedup_key:dedupKey}).limit(1);
  if(lookupError)throw lookupError;
  if(prior?.length)return NextResponse.json({received:true,duplicate:true});
  const analysis=obj(call.call_analysis);
  const {error}=await db.from("activity_events").insert({room_id:roomId,event_type:"ai_secretary.retell_post_call",payload:{
   provider:"retell",dedup_key:dedupKey,event,call_id:callId,from_number:str(call.from_number),to_number:str(call.to_number),
   started_at:call.start_timestamp??null,ended_at:call.end_timestamp??null,duration_ms:call.duration_ms??null,
   message:str(analysis.in_voicemail)??str(analysis.user_sentiment),recording_url:str(call.recording_url),
   transcript:str(call.transcript),summary:str(analysis.call_summary),successful:analysis.call_successful??null,received_at:new Date().toISOString()
  }});
  if(error)throw error;
  console.log(JSON.stringify({level:"info",msg:"retell_webhook_saved",event,callId,roomId,ms:Date.now()-started}));
  return NextResponse.json({received:true});
 }catch(error){
  console.error(JSON.stringify({level:"error",msg:"retell_webhook_failed",event,callId,error:error instanceof Error?error.message.slice(0,180):"unknown",ms:Date.now()-started}));
  return NextResponse.json({error:"Webhook processing failed"},{status:500});
 }
}
