import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import {
  buildPasswordRecoveryCallbackUrl,
  PASSWORD_RECOVERY_MESSAGE,
} from "@/lib/auth/passwordRecovery";

const requestSchema = z.object({
  email: z.string().trim().email().max(320),
});

function acceptedResponse() {
  return NextResponse.json(
    { message: PASSWORD_RECOVERY_MESSAGE },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const { email } = requestSchema.parse(await request.json());

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Password recovery is temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const redirectTo = buildPasswordRecoveryCallbackUrl(
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NODE_ENV,
    );

    if (!redirectTo) {
      logger.error("auth.password_recovery.invalid_app_url");
      return NextResponse.json(
        { error: "Password recovery is temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      logger.warn("auth.password_recovery.request_failed", {
        status: error.status,
        code: error.code,
      });
      return acceptedResponse();
    }

    return acceptedResponse();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    logger.error("auth.password_recovery.failed", {
      errorType: error instanceof Error ? error.name : "unknown_error",
    });
    return NextResponse.json(
      { error: "Password recovery is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
