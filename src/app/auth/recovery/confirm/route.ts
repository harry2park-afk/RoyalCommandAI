import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  isValidPasswordRecoveryTokenHash,
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
  PASSWORD_RECOVERY_COOKIE_PATH,
  resolvePasswordRecoveryBaseUrl,
} from "@/lib/auth/passwordRecovery";

function secureRedirect(baseUrl: string, pathname: string, status?: string) {
  const url = new URL(pathname, baseUrl);
  if (status) url.searchParams.set("status", status);

  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
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

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!isValidPasswordRecoveryTokenHash(tokenHash) || type !== "recovery") {
    return secureRedirect(baseUrl, "/forgot-password", "invalid_or_expired");
  }

  const response = secureRedirect(baseUrl, "/auth/recovery/continue");
  response.cookies.set({
    name: PASSWORD_RECOVERY_COOKIE,
    value: tokenHash!,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: PASSWORD_RECOVERY_COOKIE_PATH,
    maxAge: PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
