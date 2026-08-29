import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

function twilioAuth() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const fromNumber = process.env.TWILIO_FROM_NUMBER || "";
  return { accountSid, authToken, fromNumber, configured: Boolean(accountSid && authToken && fromNumber) };
}

function basicAuth(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("rc_phone_profiles")
    .select("phone_e164, verified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.phone_e164) return NextResponse.json({ error: "Save your phone number first" }, { status: 400 });
  if (!profile.verified) return NextResponse.json({ error: "Verify your phone number first" }, { status: 400 });

  const twilio = twilioAuth();
  if (!twilio.configured) return NextResponse.json({ error: "Phone provider is not connected" }, { status: 503 });

  const twiml = `<Response><Say language="en-AU">Royal Command test call connected successfully.</Say></Response>`;
  const body = new URLSearchParams({
    To: profile.phone_e164,
    From: twilio.fromNumber,
    Twiml: twiml,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilio.accountSid)}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(twilio.accountSid, twilio.authToken),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { sid?: string; status?: string; message?: string };
  if (!response.ok || !payload.sid) return NextResponse.json({ error: payload.message || "Test call failed" }, { status: 502 });

  return NextResponse.json({ started: true, callSid: payload.sid, status: payload.status || "queued" });
}
