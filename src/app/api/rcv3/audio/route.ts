import { requirePaidService } from "@/lib/rcv3/checkout-ledger";
import { z } from "zod";
import { access, reply, failure, input } from "@/lib/rcv3/access";
import { reserve } from "@/lib/rcv3/execution";
export const maxDuration = 40;
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Error("RCV3_ORIGIN");
    if (Number(request.headers.get("content-length") || 0) > 4100000) throw new Error("RCV3_SIZE");
    const form = await request.formData();
    const roomId = z.string().uuid().parse(form.get("roomId"));
    const requestId = z.string().uuid().parse(form.get("requestId"));
    const file = form.get("audio");
    if (!(file instanceof File) || file.size < 100 || file.size > 4000000 || !/^(audio|video)\/(webm|mp4|ogg|wav|mpeg)(;.*)?$/.test(file.type)) throw new Error("RCV3_AUDIO");
    const a = await access(roomId);
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("RCV3_AI_NOT_CONNECTED");
    requirePaidService(a.entitlement ?? null,"ai:openai");
    await reserve(a, requestId, "transcribe");
    const body = new FormData(); body.set("file", file); body.set("model", "gpt-4o-mini-transcribe");
    const language = a.user.defaultLanguage.split("-")[0];
    if (/^[a-z]{2}$/.test(language)) body.set("language", language);
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error("RCV3_TRANSCRIPTION");
    const result = z.object({ text: z.string().max(12000) }).parse(await r.json());
    return reply(result);
  } catch(e) { return failure(e); }
}
export async function PUT(request: Request) {
  try {
    const d = z.object({ roomId: z.string().uuid(), requestId: z.string().uuid(), text: z.string().trim().min(1).max(4000) }).strict().parse(await input(request, 20000));
    const a = await access(d.roomId), key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("RCV3_AI_NOT_CONNECTED");
    requirePaidService(a.entitlement ?? null,"ai:openai");
    await reserve(a, d.requestId, "speech");
    const r = await fetch("https://api.openai.com/v1/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "coral", input: d.text }), signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error("RCV3_SPEECH");
    return new Response(r.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch(e) { return failure(e); }
}
