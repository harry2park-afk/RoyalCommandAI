import { z } from "zod";
import { customerInboundCall } from "@/lib/rcv3/customer-phone-account";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return new Response("Unsupported request", { status: 415 });
    const query = z.object({ binding: z.uuid() }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    const raw = await request.text(); if (raw.length > 20000) return new Response("Request too large", { status: 413 });
    const xml = await customerInboundCall(query.binding, new URLSearchParams(raw), request.headers.get("x-twilio-signature"));
    return new Response(xml, { headers: { "Content-Type": "text/xml", "Cache-Control": "no-store" } });
  } catch {
    return new Response("<?xml version=\"1.0\"?><Response><Hangup/></Response>", { status: 403, headers: { "Content-Type": "text/xml", "Cache-Control": "no-store" } });
  }
}
