import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { signupSchema } from "@/lib/validations";
import { isSupabaseConfigured } from "@/lib/utils";
import { localDb } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = signupSchema.parse(body);

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data: auth, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            default_language: data.defaultLanguage,
            country_code: data.countryCode,
          },
        },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({
        user: { id: auth.user?.id, email: auth.user?.email },
        mode: "supabase",
      });
    }

    if (localDb.findUserByEmail(data.email)) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const user = localDb.createUser({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      defaultLanguage: data.defaultLanguage,
    });
    const token = localDb.createSession(user.id);
    const cookieStore = await cookies();
    cookieStore.set("rc_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      mode: "local",
    });
  } catch (error) {
    logger.error("auth.signup.failed", {
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
