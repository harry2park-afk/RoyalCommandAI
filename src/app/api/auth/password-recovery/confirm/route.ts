import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  isValidPasswordRecoveryTokenHash,
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_PATH,
  resolvePasswordRecoveryBaseUrl,
} from "@/lib/auth/passwordRecovery";

function secureRedirect(baseUrl: string, pathname: string, status?: string) {
  const url = new URL(pathname, baseUrl);
  if (status) url.searchParams.set("status", status);

  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set({
    name: PASSWORD_RECOVERY_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: PASSWORD_RECOVERY_COOKIE_PATH,
    maxAge: 0,
  });
  return response;
}

export async function POST(request: NextRequest) {
  const baseUrl = resolvePasswordRecoveryBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NODE_ENV,
  );
  if (!baseUrl) {
    logger.error("auth.password_recovery.invalid_app_url");
    return NextResponse.json(
      { error: "Password recovery is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const tokenHash = request.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value ?? null;
  if (!isValidPasswordRecoveryTokenHash(tokenHash)) {
    return secureRedirect(baseUrl, "/forgot-password", "invalid_or_expired");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash!,
    });

    if (!error) {
      return secureRedirect(baseUrl, "/account/update-password");
    }

    logger.warn("auth.password_recovery.verify_otp_failed", {
      status: error.status,
      code: error.code,
    });
    return secureRedirect(baseUrl, "/forgot-password", "invalid_or_expired");
  } catch (error) {
    logger.error("auth.password_recovery.confirm_failed", {
      errorType: error instanceof Error ? error.name : "unknown_error",
    });
    return secureRedirect(baseUrl, "/forgot-password", "invalid_or_expired");
  }
}
