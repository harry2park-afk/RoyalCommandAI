import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { encryptToken, exchangeCode, oauthReturnPath, verifyOAuthState } from "@/lib/google-workspace";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const oauthError = url.searchParams.get("error");
    if (oauthError) {
      const destination = new URL(oauthReturnPath(state, user.id) || "/rooms", request.url);
      destination.searchParams.set("google_workspace", "error");
      return NextResponse.redirect(destination);
    }
    if (!code || !verifyOAuthState(state, user.id)) return NextResponse.json({ error: "Invalid Google OAuth callback" }, { status: 400 });

    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.json({ error: "Google did not return an offline refresh token. Reconnect with consent." }, { status: 409 });
    }

    const tempAccess = tokens.access_token;
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tempAccess}` }, cache: "no-store",
    });
    const profile = await profileResponse.json().catch(() => ({}));
    if (!profileResponse.ok) throw new Error(profile?.error?.message || "Could not read Google account profile");

    const supabase = await createClient();
    const { error } = await supabase.from("google_workspace_connections").upsert({
      user_id: user.id,
      google_email: String(profile.email || ""),
      refresh_token_ciphertext: encryptToken(tokens.refresh_token),
      scopes: String(tokens.scope || "").split(/\s+/).filter(Boolean),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);

    const destination = new URL(oauthReturnPath(state, user.id) || "/dashboard", request.url);
    destination.searchParams.set("google_workspace", "connected");
    return NextResponse.redirect(destination);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google OAuth callback failed" }, { status: 500 });
  }
}
