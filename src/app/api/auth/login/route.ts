import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { loginSchema, signupSchema } from "@/lib/validations";
import { isSupabaseConfigured } from "@/lib/utils";
import { localDb } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const { data: auth, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      return NextResponse.json({
        user: {
          id: auth.user?.id,
          email: auth.user?.email,
        },
        mode: "supabase",
      });
    }

    const user = localDb.findUserByEmail(data.email);
    if (!user || user.password !== data.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }
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
    logger.error("auth.login.failed", {
      error: error instanceof Error ? error.message : error,
    });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
