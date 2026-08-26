import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { auditToolGateway, evaluateToolPermission, getToolCapabilities } from "@/lib/tool-gateway";

const OWNER_DEV_EMAILS = new Set(["harry2park@gmail.com", "harry@royalcommand.ai"]);

function isOwner(email: string) {
  return OWNER_DEV_EMAILS.has(email.trim().toLowerCase());
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const capabilities = getToolCapabilities();
  auditToolGateway("manifest_read", {
    userId: user.id,
    connected: capabilities.filter((item) => item.connection !== "not_connected").map((item) => item.id),
  });

  return NextResponse.json({
    ok: true,
    gateway: "Royal Command Shared Tool Gateway",
    universalMasterKey: false,
    credentialPolicy: "server-side scoped credentials only; secret values are never returned",
    githubWritePolicy: "host Work ID + Revision + Provider required; provider-scoped rc-work branch only; no direct master write",
    supportedDeveloperProviders: ["openai", "anthropic", "google", "xai"],
    owner: isOwner(user.email),
    capabilities,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const capability = String(body?.capability || "").trim();
  if (!capability) return NextResponse.json({ error: "capability is required" }, { status: 400 });

  const owner = isOwner(user.email);
  const approved = body?.approved === true;
  const result = evaluateToolPermission(capability, { owner, approved });
  auditToolGateway("policy_check", {
    userId: user.id,
    capability,
    decision: result.decision,
    owner,
    approved,
  });

  return NextResponse.json({ ok: true, ...result });
}
