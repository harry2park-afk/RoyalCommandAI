import { notFound, redirect } from "next/navigation";
import { session } from "@/lib/rcv3/access";
import { listConnectors, isProviderConfigured } from "@/lib/ai/connectors";
import { PROVIDER_LABELS } from "@/lib/ai/types";
import Room from "./Room";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  try { await session(); } catch(e) { if (e instanceof Error && e.message === "RCV3_AUTH") redirect("/login?next=%2Frcv3"); throw e; }
  const {user,db}=await session();
  const {data:secretaryRooms}=await db.from("rooms").select("id,name").eq("room_owner_id",user.id).neq("status","archived").or("description.is.null,description.neq.rcv3-private-preview-v1");
  return <Room language={user.defaultLanguage} secretaryRooms={secretaryRooms??[]} providers={listConnectors().map(c=>({id:c.id,label:PROVIDER_LABELS[c.id],configured:isProviderConfigured(c.id)}))} />;
}
