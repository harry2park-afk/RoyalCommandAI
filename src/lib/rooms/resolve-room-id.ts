const ROOM_ROUTE_ALIASES: Record<string, string> = {
  rca: "89fe50fc-12bf-4fa0-8da8-aff065bae960",
};

export function resolveRoomRouteId(roomId: string) {
  const normalized = String(roomId || "").trim();
  return ROOM_ROUTE_ALIASES[normalized.toLowerCase()] || normalized;
}
