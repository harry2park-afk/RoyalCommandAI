import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  LAYOUT_EDITOR_PASSWORD_COOKIE,
  LAYOUT_EDITOR_SESSION_MINUTES,
  requireLayoutAdmin,
  signPasswordEditorProof,
} from "@/lib/layout-editor-security";

const COOKIE_BASE = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/" };

export async function POST(request: Request) {
  try {
    const user = await requireLayoutAdmin();
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) return NextResponse.json({ error: "Password is required." }, { status: 400 });

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (error) return NextResponse.json({ error: "Password verification failed." }, { status: 401 });

    const response = NextResponse.json({ ok: true, sessionMinutes: LAYOUT_EDITOR_SESSION_MINUTES });
    response.cookies.set(LAYOUT_EDITOR_PASSWORD_COOKIE, signPasswordEditorProof(user.id), {
      ...COOKIE_BASE,
      maxAge: LAYOUT_EDITOR_SESSION_MINUTES * 60,
    });
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNAUTHENTICATED") return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (code === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    return NextResponse.json({ error: "Layout Editor unlock unavailable." }, { status: 503 });
  }
}
