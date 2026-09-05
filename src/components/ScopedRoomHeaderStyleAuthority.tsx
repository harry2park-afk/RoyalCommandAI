"use client";

import { usePathname } from "next/navigation";
import RoomHeaderStyleAuthority from "@/components/RoomHeaderStyleAuthority";

const CUSTOMER_ROOM = /^\/rooms\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/?$/i;

export default function ScopedRoomHeaderStyleAuthority() {
  const pathname = usePathname();
  if (CUSTOMER_ROOM.test(pathname || "")) return null;
  return <RoomHeaderStyleAuthority />;
}
