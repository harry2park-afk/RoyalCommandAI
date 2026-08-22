"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type RoomSummary = {
  id?: string;
  name?: string;
  title?: string;
  room_type?: string;
  type?: string;
};

export default function FirstRoomWelcome() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkRooms = async () => {
      try {
        const response = await fetch("/api/rooms", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const rooms: RoomSummary[] = Array.isArray(data?.rooms)
          ? data.rooms
          : Array.isArray(data)
            ? data
            : [];

        const createdRooms = rooms.filter((room) => {
          if (!room?.id || room.id === roomId) return false;
          const label = `${room.name || ""} ${room.title || ""} ${room.room_type || ""} ${room.type || ""}`.toLowerCase();
          return !label.includes("command room");
        });

        if (!cancelled) setShow(createdRooms.length === 0);
      } catch {
        if (!cancelled) setShow(false);
      }
    };

    void checkRooms();
    const timer = window.setInterval(checkRooms, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomId]);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[12px] z-[345] w-[min(820px,58vw)] -translate-x-1/2 text-center drop-shadow-[0_1px_8px_rgba(212,175,55,0.28)]"
      style={{
        fontFamily: '\"Bodoni Bd BT\", \"Bodoni 72\", Didot, \"Times New Roman\", serif',
        fontSize: "27px",
        fontWeight: 700,
        fontStyle: "italic",
        lineHeight: 1.15,
        letterSpacing: "0.015em",
        color: "#d4af37",
      }}
      aria-hidden="true"
    >
      Build your first Room and bring your dreams to life with AI.
    </div>
  );
}
