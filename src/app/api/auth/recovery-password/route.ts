import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";

const updatePasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

function requestHasSafeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function recoveryAuthorized() {
  const cookieStore = await cookies();
  if (cookieStore.get(RECOVERY_COOKIE)?.value !== "1") {
    return { authorized: false as const, cookieStore };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { authorized: false as const, cookieStore };
  }

  return { authorized: true as const, cookieStore, supabase };
}

export async function GET() {
  const recovery = await recoveryAuthorized();
  if (!recovery.authorized) {
    return NextResponse.json({ authorized: false }, { status: 401 });
  }

  return NextResponse.json({ authorized: true });
}

export async function POST(request: Request) {
  if (!requestHasSafeOrigin(request)) {
    return NextResponse.json({ error: "Invalid recovery request" }, { status: 403 });
  }

  const recovery = await recoveryAuthorized();
  if (!recovery.authorized) {
    return NextResponse.json({ error: "Recovery session is missing or expired" }, { status: 401 });
  }

  try {
    const body = updatePasswordSchema.parse(await request.json());
    const { error } = await recovery.supabase.auth.updateUser({ password: body.password });
    if (error) {
      return NextResponse.json(
        { error: "Password could not be updated. Request a new recovery link." },
        { status: 400 },
      );
    }

    await recovery.supabase.auth.signOut();
    recovery.cookieStore.set(RECOVERY_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ updated: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
    }
    return NextResponse.json({ error: "Password update failed" }, { status: 500 });
  }
}
