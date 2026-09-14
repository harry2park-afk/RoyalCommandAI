import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assertPreview, digest } from "@/lib/website-studio/contract";
import { advance, begin, planSchema } from "@/lib/website-studio/executor";
import { readState } from "@/lib/website-studio/github";
import { verifyPreview } from "@/lib/website-studio/preview";

export const runtime = "nodejs";
export const maxDuration = 300;
const inputSchema = z.object({ roomId: z.string().uuid(), requestKey: z.string().uuid(), order: z.string().min(1).max(12000), workId: z.string().optional(), designVersion: z.number().int().positive().optional(), baseSha: z.string().regex(/^[a-f0-9]{40}$/).optional(), design: planSchema.optional() });

async function authorize(roomId: string) {
  assertPreview(process.env.VERCEL_ENV, process.env.VERCEL_GIT_COMMIT_REF);
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const developers = ["harry2park@gmail.com", "harry@royalcommand.ai", ...(process.env.ROYAL_COMMAND_DEV_EMAILS || "").split(",").map((email) => email.trim().toLowerCase())];
  if (!developers.includes(user.email.toLowerCase())) throw new Error("FORBIDDEN");
  const client = await createClient();
  const { data, error } = await client.from("room_factory_manifests").select("template_id").eq("room_id", roomId).single();
  if (error || data?.template_id !== "website") throw new Error("STUDIO_ROOM_REQUIRED");
  return user;
}
function failed(error: unknown) {
  const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "WORK_FAILED";
  return Response.json({ error: code }, { status: code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 409 });
}
export async function GET(request: Request) {
  try {
    const roomId = z.string().uuid().parse(new URL(request.url).searchParams.get("roomId"));
    const user = await authorize(roomId);
    const current = await readState();
    const state = current?.state.actorHash === digest(user.id) && current.state.roomHash === digest(roomId) ? current.state : null;
    return Response.json({ state, deploymentSha: process.env.VERCEL_GIT_COMMIT_SHA }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failed(error); }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new Error("ORIGIN_MISMATCH");
    const input = inputSchema.parse(await request.json());
    const user = await authorize(input.roomId);
    if (!input.workId) return Response.json({ state: (await begin(user.id, input.roomId, input.requestKey, input.order)).state });
    if (!input.designVersion || !input.baseSha) throw new Error("WORK_IDENTITY_REQUIRED");
    const cookieStore = await cookies();
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
    const sessionCookies = cookieStore.getAll().filter((cookie) => cookie.name === `sb-${projectRef}-auth-token` || cookie.name.startsWith(`sb-${projectRef}-auth-token.`)).map(({ name, value }) => ({ name, value }));
    const result = await advance({ ...input, actor: user.id, room: input.roomId, workId: input.workId, designVersion: input.designVersion, baseSha: input.baseSha }, (sha) => verifyPreview(sha, input.roomId, sessionCookies));
    return Response.json({ state: result.snapshot.state, design: result.design });
  } catch (error) { return failed(error); }
}
