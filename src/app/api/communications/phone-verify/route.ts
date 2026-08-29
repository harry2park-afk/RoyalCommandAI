import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send") }),
  z.object({ action: z.literal("check"), code: z.string().trim().regex(/^[0-9]{4,10}$/) }),
]);

function twilioAuth() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";
  return { accountSid, authToken, verifyServiceSid, configured: Boolean(accountSid && authToken && verifyServiceSid) };
}

function basicAuth(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const input = schema.parse(await request.json());
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("rc_phone_profiles")
    .select("phone_e164")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.phone_e164) return NextResponse.json({ error: "Save your phone number first" }, { status: 400 });

  const twilio = twilioAuth();
  if (!twilio.configured) return NextResponse.json({ error: "Phone verification provider is not connected" }, { status: 503 });

  const endpoint = input.action === "send" ? "Verifications" : "VerificationCheck";
  const body = new URLSearchParams({ To: profile.phone_e164 });
  if (input.action === "send") body.set("Channel", "sms");
  else body.set("Code", input.code);

  const response = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(twilio.verifyServiceSid)}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(twilio.accountSid, twilio.authToken),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { status?: string; message?: string };
  if (!response.ok) return NextResponse.json({ error: payload.message || "Phone verification failed" }, { status: 502 });

  if (input.action === "send") return NextResponse.json({ sent: true, status: payload.status || "pending" });

  const approved = payload.status === "approved";
  if (approved) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("rc_phone_profiles")
      .update({ verified: true, verified_at: now, updated_at: now })
      .eq("user_id", user.id)
      .eq("phone_e164", profile.phone_e164);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ verified: approved, status: payload.status || "pending" });
}
