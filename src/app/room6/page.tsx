import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DomainRuntimeProvider } from "@/components/DomainRuntimeProvider";
import { getServerDomainRuntimeContext } from "@/lib/runtime/serverDomainContext";
import { toPublicDomainRuntimeContext } from "@/config/countryResolver";
import Room6 from "./Room6";

export const dynamic = "force-dynamic";
export const metadata = { title: "Room 6 · Royal Command Preview" };
export default async function Room6Page({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(query.room ? `/room6?room=${query.room}` : "/room6")}`);
  const runtime = await getServerDomainRuntimeContext();
  if (!runtime) notFound();
  const db = await createClient();
  const result = await db.from("rooms").select("id,name,status").eq("room_owner_id", user.id).neq("status", "archived").order("created_at", { ascending: false });
  if (result.error) return <main className="p-8"><p role="alert">기존 방을 불러오지 못했습니다.</p><Link href="/room6">다시 불러오기</Link></main>;
  const rooms = (result.data || []).map(r => ({ id: String(r.id), name: String(r.name) }));
  const room = rooms.find(r => r.id === query.room);
  if (query.room && !room) notFound();
  return <DomainRuntimeProvider value={toPublicDomainRuntimeContext(runtime)}>
    {room ? <Room6 key={room.id} room={room} rooms={rooms}/> : <main className="min-h-screen bg-[#07111f] p-8 text-white">
      <Link href="/rooms/rca" className="text-[#ffe18a]">← RC Room</Link>
      <h1 className="my-6 text-2xl">룸6 적용할 방 선택</h1>
      <div className="grid max-w-3xl gap-3">{rooms.map(r => <Link className="rounded-xl border border-white/30 p-5 hover:bg-white/10" key={r.id} href={`/room6?room=${r.id}`}>{r.name}</Link>)}</div>
      {!rooms.length && <p>기존 방이 없습니다. <Link className="underline" href="/create-room">방 만들기</Link></p>}
    </main>}
  </DomainRuntimeProvider>;
}
