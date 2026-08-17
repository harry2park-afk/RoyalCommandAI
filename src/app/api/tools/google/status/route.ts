import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleConnection, googleWorkspaceConfigured } from "@/lib/google-workspace";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connection = await getGoogleConnection(user.id);
  return NextResponse.json({
    ok: true,
    oauthConfigured: googleWorkspaceConfigured(),
    connected: Boolean(connection),
    googleEmail: connection?.google_email || null,
    scopes: connection?.scopes || [],
    connectedAt: connection?.connected_at || null,
  });
}
