import { accountAnswerLanguage } from "@/lib/rcv3/answer-language";
import { notFound, redirect } from "next/navigation";
import { session } from "@/lib/rcv3/access";
import { listConnectors, isProviderConfigured } from "@/lib/ai/connectors";
import { PROVIDER_LABELS } from "@/lib/ai/types";
import Room from "./Room";
import { canManageToolbox } from '@/lib/rcv3/toolbox-authority';
export const dynamic = "force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams;
  const next=new URLSearchParams();
  if(typeof query.room==='string'&&/^[a-f0-9-]{36}$/i.test(query.room))next.set('room',query.room);
  if(query.billing==='1')next.set('billing','1');
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  try { await session(); } catch(e) { if (e instanceof Error && e.message === "RCV3_AUTH") redirect(`/login?next=${encodeURIComponent(`/rcv3${next.size?`?${next}`:''}`)}`); throw e; }
  const {user,db}=await session();
  const {data:secretaryRooms}=await db.from("rooms").select("id,name").eq("room_owner_id",user.id).neq("status","archived").or("description.is.null,description.neq.rcv3-private-preview-v1");
  const language = await accountAnswerLanguage({user,db});
  return <Room toolboxManager={canManageToolbox(user)} language={language} secretaryRooms={secretaryRooms??[]} providers={listConnectors().map(c=>({id:c.id,label:PROVIDER_LABELS[c.id],configured:isProviderConfigured(c.id)}))} />;
}
