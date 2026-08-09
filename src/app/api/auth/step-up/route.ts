import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/utils";
import { localDb } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import {
  createStepUpToken,
  STEP_UP_COOKIE,
  STEP_UP_TTL,
  verifyStepUpToken,
} from "@/lib/security/step-up";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ verified: false }, { status: 401 });
  const cookieStore = await cookies();
  const verified = verifyStepUpToken(cookieStore.get(STEP_UP_COOKIE)?.value, user.id);
  return NextResponse.json({ verified });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  let valid = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.password,
    });
    valid = !error;
  } else {
    const localUser = localDb.findUserByEmail(user.email);
    valid = Boolean(localUser && localUser.password === parsed.data.password);
  }

  if (!valid) {
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  }

  const token = createStepUpToken(user.id);
  if (!token) {
    return NextResponse.json(
      { error: "Step-up security is not configured on this server" },
      { status: 503 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(STEP_UP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: STEP_UP_TTL,
  });

  return NextResponse.json({ verified: true, expiresInSeconds: STEP_UP_TTL });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(STEP_UP_COOKIE);
  return NextResponse.json({ verified: false });
}
