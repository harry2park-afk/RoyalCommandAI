import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { room6DesignSchema } from "@/lib/rooms/room6-design";
import { readRoom6Design, writeRoom6Design } from "@/lib/rooms/room6-storage";

export const dynamic = "force-dynamic";
function reply(value: unknown, status = 200) { return Response.json(value, { status, headers: { "Cache-Control": "no-store" } }); }
const inputSchema = z.object({ roomId: z.string().uuid(), revision: z.number().int().min(0).max(9999999998), design: room6DesignSchema }).strict();
async function access(roomId: string | null) {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") return { error: reply({ error: "Not found" }, 404) };
  const user = await getCurrentUser();
  if (!user) return { error: reply({ error: "로그인이 필요합니다." }, 401) };
  if (!z.string().uuid().safeParse(roomId).success) return { error: reply({ error: "방 주소가 올바르지 않습니다." }, 400) };
  const db = await createClient();
  const result = await db.from("rooms").select("id").eq("id", roomId!).eq("room_owner_id", user.id).neq("status", "archived").maybeSingle();
  if (result.error) return { error: reply({ error: "방 권한을 확인하지 못했습니다." }, 503) };
  if (!result.data) return { error: reply({ error: "방을 찾지 못했습니다." }, 404) };
  return { user, db };
}
function failure(error: unknown) {
  const conflict = error instanceof Error && error.message === "ROOM6_CONFLICT";
  return reply({ error: conflict ? "다른 창에서 배치가 변경됐습니다. 현재 편집 내용을 내보낸 뒤 다시 불러오세요." : "배치를 저장하거나 불러오지 못했습니다. 현재 편집 내용은 유지됩니다.", code: conflict ? "ROOM6_CONFLICT" : "ROOM6_STORAGE" }, conflict ? 409 : 503);
}
export async function GET(request: Request) {
  try {
    const roomId = new URL(request.url).searchParams.get("room");
    const allowed = await access(roomId);
    if (allowed.error) return allowed.error;
    return reply(await readRoom6Design(allowed.db!, allowed.user!.id, roomId!));
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 1_500_000) return reply({ error: "배경 그림이 너무 큽니다." }, 413);
    const raw = await request.text();
    if (raw.length > 1_500_000) return reply({ error: "배경 그림이 너무 큽니다." }, 413);
    let parsed;
    try { parsed = inputSchema.safeParse(JSON.parse(raw)); } catch { return reply({ error: "잘못된 배치입니다." }, 400); }
    if (!parsed.success) return reply({ error: "허용되지 않은 버튼 또는 배치입니다." }, 400);
    const allowed = await access(parsed.data.roomId);
    if (allowed.error) return allowed.error;
    return reply(await writeRoom6Design(allowed.db!, allowed.user!.id, parsed.data.roomId, parsed.data.revision, parsed.data.design));
  } catch (error) { return failure(error); }
}
