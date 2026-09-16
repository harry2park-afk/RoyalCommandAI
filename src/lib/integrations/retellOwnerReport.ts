import { createHash } from "node:crypto";

type Json = Record<string, unknown>;
const object = (v: unknown): Json => v && typeof v === "object" && !Array.isArray(v) ? v as Json : {};
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
export type ReportConfig = {
  roomId: string; inboundAgentId: string; reporterAgentId: string;
  from: string; to: string; apiKey: string;
};

// Server-only configuration. Never accept a destination or agent from caller content.
export function reportConfig(env: Record<string, string | undefined>): ReportConfig | null {
  if (env.RETELL_OWNER_REPORT_ENABLED !== "true") return null;
  if (env.RETELL_OWNER_REPORT_FORWARDING_VERIFIED !== "true") return null;
  const config = {
    roomId: text(env.RETELL_OWNER_REPORT_ROOM_ID),
    inboundAgentId: text(env.RETELL_OWNER_REPORT_INBOUND_AGENT_ID),
    reporterAgentId: text(env.RETELL_OWNER_REPORT_AGENT_ID),
    from: text(env.RETELL_OWNER_REPORT_FROM), to: text(env.RETELL_OWNER_REPORT_TO),
    apiKey: text(env.RETELL_API_KEY_PREVIEW || env.RETELL_API_KEY),
  };
  if (Object.values(config).some(v => !v)) return null;
  if (!/^\+[1-9]\d{7,14}$/.test(config.from) || !/^\+[1-9]\d{7,14}$/.test(config.to)) return null;
  if (config.from === config.to || config.inboundAgentId === config.reporterAgentId) return null;
  return config;
}

export function reportRequest(event: string, call: Json, roomId: string, config: ReportConfig) {
  const summary = text(object(call.call_analysis).call_summary);
  if (event !== "call_analyzed" || roomId !== config.roomId || call.direction !== "inbound"
    || call.call_type !== "phone_call" || call.call_status !== "ended"
    || call.agent_id !== config.inboundAgentId || call.to_number !== config.from
    || call.from_number === config.from || object(call.metadata).purpose === "owner_report"
    || !text(call.call_id) || !summary) return null;
  return {
    from_number: config.from, to_number: config.to,
    override_agent_id: config.reporterAgentId, override_agent_version: "latest_published",
    metadata: { purpose: "owner_report", source_call_id: call.call_id, room_id: roomId },
    retell_llm_dynamic_variables: {
      report_data: JSON.stringify({ caller_number: text(call.from_number), summary: summary.slice(0, 6000) }),
    },
  };
}

export function reportClaimId(roomId: string, callId: string) {
  const h = createHash("sha256").update(JSON.stringify(["retell-owner-report-v1", roomId, callId])).digest("hex");
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

export type ReportStore = {
  claim(id: string, roomId: string, sourceCallId: string): Promise<boolean>;
  finish(id: string, state: string, outboundCallId?: string): Promise<void>;
};

// At most one attempt per source call, including concurrent webhook deliveries.
// An uncertain HTTP outcome must never be retried automatically (could double-dial).
export async function sendOwnerReport(event: string, call: Json, roomId: string,
  config: ReportConfig | null, store: ReportStore, request: typeof fetch = fetch) {
  if (!config) return "disabled";
  const body = reportRequest(event, call, roomId, config);
  if (!body) return "skipped";
  const id = reportClaimId(roomId, text(call.call_id));
  if (!await store.claim(id, roomId, text(call.call_id))) return "duplicate";
  let state = "unknown";
  let outboundCallId: string | undefined;
  try {
    const response = await request("https://api.retellai.com/v2/create-phone-call", {
      method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(3000), redirect: "error",
    });
    if (response.ok) {
      outboundCallId = text(object(await response.json()).call_id) || undefined;
      state = outboundCallId ? "requested" : "unknown";
    } else {
      state = response.status >= 500 ? "unknown" : "rejected";
    }
  } catch { /* No raw provider errors: they may contain caller data. */ }
  await store.finish(id, state, outboundCallId);
  return state; // requested does NOT mean answered or report delivered.
}
