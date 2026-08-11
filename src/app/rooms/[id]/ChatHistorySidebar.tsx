"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

type Room = { id: string; name: string };

export default function ChatHistorySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentId = pathname.split("/").filter(Boolean).pop() || "";
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rooms", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && Array.isArray(data.rooms)) setRooms(data.rooms);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function removeRoom(id: string) {
    if (!window.confirm("이 채팅을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setRooms((prev) => prev.filter((room) => room.id !== id));
    if (id === currentId) router.push("/dashboard");
  }

  return (
    <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-black/20 lg:flex lg:min-h-screen lg:flex-col">
      <div className="border-b border-white/10 px-3 py-3">
        <div className="text-sm font-semibold text-[var(--gold-soft)]">채팅 목록</div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`group flex items-center rounded-lg border ${room.id === currentId ? "border-[var(--gold)]/60 bg-[var(--gold)]/10" : "border-transparent hover:bg-white/[0.03]"}`}
          >
            <Link
              href={`/rooms/${room.id}`}
              className="min-w-0 flex-1 truncate px-3 py-2 text-sm"
              title={room.name}
            >
              {room.name}
            </Link>
            <button
              type="button"
              onClick={() => void removeRoom(room.id)}
              className="mr-1 rounded-md p-1.5 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-300"
              title="채팅 삭제"
              aria-label={`${room.name} 삭제`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
