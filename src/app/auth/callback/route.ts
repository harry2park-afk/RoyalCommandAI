import { NextResponse } from "next/server";
import { sanitizeRecoveryPath } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";

export const RECOVERY_COOKIE = "rc_password_recovery";

function recoveryFailureUrl(origin: string) {
  return new URL("/forgot-password?recovery=invalid", origin);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = sanitizeRecoveryPath(requestUrl.searchParams.get("next"));

  if (!code && !(tokenHash && type === "recovery")) {
    return NextResponse.redirect(recoveryFailureUrl(requestUrl.origin));
  }

  const supabase = await createClient();

  const result = tokenHash && type === "recovery"
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
    : await supabase.auth.exchangeCodeForSession(code!);

  if (result.error) {
    return NextResponse.redirect(recoveryFailureUrl(requestUrl.origin));
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  response.cookies.set(RECOVERY_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
