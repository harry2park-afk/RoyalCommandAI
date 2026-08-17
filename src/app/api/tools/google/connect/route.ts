import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOAuthState, googleAuthUrl, googleWorkspaceConfigured } from "@/lib/google-workspace";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!googleWorkspaceConfigured()) {
    return NextResponse.json({
      error: "Google Workspace OAuth is not configured",
      required: ["GOOGLE_WORKSPACE_CLIENT_ID", "GOOGLE_WORKSPACE_CLIENT_SECRET", "GOOGLE_WORKSPACE_TOKEN_KEY"],
    }, { status: 503 });
  }
  const url = googleAuthUrl(createOAuthState(user.id));
  if (new URL(request.url).searchParams.get("json") === "1") return NextResponse.json({ ok: true, url });
  return NextResponse.redirect(url);
}
