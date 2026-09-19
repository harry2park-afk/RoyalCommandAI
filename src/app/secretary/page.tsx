import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { DomainRuntimeProvider } from "@/components/DomainRuntimeProvider";
import { getServerDomainRuntimeContext } from "@/lib/runtime/serverDomainContext";
import { toPublicDomainRuntimeContext } from "@/config/countryResolver";
import CustomerAISecretary from "../rooms/[id]/CustomerAISecretary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Katie · AI 비서방 | Royal Command" };

export default async function SecretaryPage({ searchParams }: {
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  const query = await searchParams;
  const roomId = typeof query.room === "string" ? query.room : undefined;
  const user = await getCurrentUser();
  const next = roomId ? `/secretary?room=${encodeURIComponent(roomId)}` : "/secretary";
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!isSupabaseConfigured()) return <main className="p-8">비서방 연결 설정을 확인해 주세요.</main>;
  const db = await createClient();
  const { data: rooms, error } = await db.from("rooms")
    .select("id,name,status,created_at")
    .eq("room_owner_id", user.id).order("created_at", { ascending: false });
  if (error) return <main className="p-8"><p role="alert">기존 방을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p><Link href="/secretary">다시 시도</Link></main>;
  const room = roomId ? rooms?.find((item) => item.id === roomId && item.status !== "archived") : undefined;
  if (roomId && !room) notFound();
  const runtime = await getServerDomainRuntimeContext();
  if (!runtime) notFound();
  return <DomainRuntimeProvider value={toPublicDomainRuntimeContext(runtime)}><main className="min-h-screen bg-[#07111f] text-[#f4f0e7]">
    <header className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-4 px-5 py-4">
      <Link href="/rooms/rca" className="rounded-lg border border-[#d7b64d]/50 px-4 py-2 text-[#f0d36a]">← Command Room</Link>
      <h1 className="text-xl font-semibold">Katie 비서방{room ? ` · ${room.name}` : ""}</h1>
      {room ? <Link href="/secretary" className="ml-auto text-sm text-[#f0d36a]">다른 방의 기록 보기</Link> : null}
    </header>
    {room ? <CustomerAISecretary key={room.id} roomId={room.id} standalone/> : <section className="mx-auto max-w-3xl px-5 py-8">
      <p className="mb-6 text-white/70">기존 방을 선택하면 그 방의 Katie 대화와 메일·전화 기록을 열 수 있습니다.</p>
      <div className="grid gap-3">{rooms?.filter((item) => item.status !== "archived").map((item) => <Link key={item.id} href={`/secretary?room=${encodeURIComponent(item.id)}`} className="rounded-xl border border-[#d7b64d]/40 bg-white/5 p-5 hover:bg-white/10">
        <span className="font-semibold text-[#f0d36a]">{item.name}</span>
        <span className="float-right">열기 →</span>
        <p className="mt-2 text-xs text-white/50">{item.created_at?.slice(0, 10)} · {item.id.slice(0, 8)}</p>
      </Link>)}</div>
      {!rooms?.some((item) => item.status !== "archived") ? <p>연결할 기존 방이 없습니다. <Link href="/dashboard" className="underline">내 방 목록 보기</Link></p> : null}
    </section>}
  </main></DomainRuntimeProvider>;
}
