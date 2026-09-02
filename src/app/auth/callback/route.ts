import { NextResponse } from "next/server";
import { sanitizeRecoveryPath } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";

function recoveryFailureUrl(origin: string) {
  return new URL("/login?recovery=invalid", origin);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeRecoveryPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(recoveryFailureUrl(requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(recoveryFailureUrl(requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
