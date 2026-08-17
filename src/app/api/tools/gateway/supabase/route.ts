import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { auditToolGateway, evaluateToolPermission } from "@/lib/tool-gateway";

const OWNER_EMAILS = new Set(["harry2park@gmail.com", "harry@royalcommand.ai"]);
const READ_TABLES = new Set(["rooms", "messages", "documents", "decisions", "service_instances", "ai_runs"]);
const WRITE_TABLES = new Set(["decisions", "service_instances"]);

function isOwner(email: string) {
  return OWNER_EMAILS.has(email.trim().toLowerCase());
}

function cleanValues(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (["id", "created_at", "updated_at", "decided_at", "decided_by", "authorised_by"].includes(key)) continue;
    output[key] = raw;
  }
  return output;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "").trim();
    const approved = body?.approved === true;
    const decision = evaluateToolPermission("database.app", { owner: isOwner(user.email), approved });
    if (decision.decision !== "allow") {
      return NextResponse.json({ ok: false, ...decision }, { status: decision.decision === "approval_required" ? 409 : 403 });
    }

    const supabase = await createClient();
    let result: unknown;

    if (action === "schema") {
      if (!isOwner(user.email)) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
      const { data, error } = await supabase.rpc("rc_tool_gateway_schema_snapshot");
      if (error) throw error;
      result = data;
    } else if (action === "select") {
      const table = String(body?.table || "").trim();
      if (!READ_TABLES.has(table)) return NextResponse.json({ error: "Table is not allow-listed for gateway reads" }, { status: 400 });
      const limit = Math.max(1, Math.min(Number(body?.limit) || 50, 100));
      let query = supabase.from(table).select("*").limit(limit);
      const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";
      if (roomId && table !== "rooms") query = query.eq("room_id", roomId);
      const { data, error } = await query;
      if (error) throw error;
      result = data;
    } else if (action === "insert") {
      const table = String(body?.table || "").trim();
      if (!WRITE_TABLES.has(table)) return NextResponse.json({ error: "Table is not allow-listed for gateway writes" }, { status: 400 });
      const values = cleanValues(body?.values);
      const { data, error } = await supabase.from(table).insert(values).select("*").limit(1);
      if (error) throw error;
      result = data;
    } else if (action === "update") {
      const table = String(body?.table || "").trim();
      const id = String(body?.id || "").trim();
      if (!WRITE_TABLES.has(table)) return NextResponse.json({ error: "Table is not allow-listed for gateway writes" }, { status: 400 });
      if (!id) return NextResponse.json({ error: "Row id is required" }, { status: 400 });
      const values = cleanValues(body?.values);
      const { data, error } = await supabase.from(table).update(values).eq("id", id).select("*").limit(1);
      if (error) throw error;
      result = data;
    } else {
      return NextResponse.json({ error: "Unsupported Supabase gateway action" }, { status: 400 });
    }

    auditToolGateway("supabase_execute", { userId: user.id, action, ok: true });
    return NextResponse.json({ ok: true, capability: "database.app", action, result });
  } catch (error) {
    auditToolGateway("supabase_execute_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Supabase Tool Gateway failed" }, { status: 500 });
  }
}
