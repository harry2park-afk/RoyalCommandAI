type RecordData = Record<string, unknown>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Dedicated incoming-call binding. Independent of the optional outbound reporting flag.
export function configuredIncomingRoom(call: RecordData, env: Record<string, string | undefined>) {
  const room = env.RETELL_INBOUND_ROOM_ID?.trim();
  const agent = env.RETELL_OWNER_REPORT_INBOUND_AGENT_ID?.trim();
  const number = env.RETELL_OWNER_REPORT_FROM?.trim();
  if (!room || !uuid.test(room) || !agent || !number) return null;
  if (call.direction !== "inbound" || call.call_type !== "phone_call" || call.agent_id !== agent || call.to_number !== number) return null;
  return room;
}

// Query is newest first. Never let an older null recording/summary erase newer data.
export function mergeCallRecords(rows: Array<{ id: string; payload: unknown; created_at: string }>) {
  const merged = new Map<string, RecordData>();
  for (const row of rows) {
    const p = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload as RecordData : {};
    const id = typeof p.call_id === "string" ? p.call_id : row.id;
    const current = merged.get(id);
    if (!current) merged.set(id, { ...p, id: row.id, created_at: row.created_at });
    else for (const [key, value] of Object.entries(p)) {
      if ((current[key] === null || current[key] === undefined || current[key] === "") && value !== null && value !== undefined && value !== "") current[key] = value;
    }
  }
  return Array.from(merged.values());
}
