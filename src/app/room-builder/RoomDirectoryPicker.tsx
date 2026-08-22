"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ROOM_DIRECTORY } from "@/lib/rooms/directory";

export default function RoomDirectoryPicker() {
  const [query, setQuery] = useState("");
  const clean = query.trim().toLowerCase();

  const visible = useMemo(() => {
    if (!clean) return ROOM_DIRECTORY;
    return ROOM_DIRECTORY.filter((room) => `${room.label} ${room.ko}`.toLowerCase().includes(clean));
  }, [clean]);

  function chooseRoom(room: (typeof ROOM_DIRECTORY)[number]) {
    const current = new URL(window.location.href);
    const returnRoom = current.searchParams.get("returnRoom") || "";
    const next = new URL("/room-builder", window.location.origin);
    next.searchParams.set("template", room.templateId);
    next.searchParams.set("name", room.label);
    next.searchParams.set("roomType", room.id);
    if (returnRoom) next.searchParams.set("returnRoom", returnRoom);
    window.location.assign(next.toString());
  }

  return (
    <aside className="fixed right-4 top-4 z-[240] hidden h-[calc(100dvh-32px)] w-[310px] flex-col overflow-hidden rounded-2xl border-2 border-[var(--gold)]/65 bg-[#07111f]/97 shadow-[0_20px_70px_rgba(0,0,0,.55)] backdrop-blur-md 2xl:flex">
      <div className="border-b border-white/10 p-3">
        <div className="text-sm font-semibold text-[var(--gold-soft)]">Room 찾기 · 전체 리스트</div>
        <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">🔴 원하는 Room을 검색하거나 아래 목록에서 선택하세요.</p>
        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rc-input !border-red-500/70 !pl-9 text-sm focus:!border-red-400"
            placeholder="예: 법률, 스포츠, Dream Home"
            aria-label="Room 검색"
          />
        </div>
        <div className="mt-2 text-[10px] text-[var(--muted)]">전체 {ROOM_DIRECTORY.length}개 · 검색 결과 {visible.length}개</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {visible.map((room, index) => (
            <button
              key={room.id}
              type="button"
              onClick={() => chooseRoom(room)}
              className="flex w-full items-start gap-2 rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-left transition hover:border-[var(--gold)]/55 hover:bg-[var(--gold)]/10"
              title={`${room.label} / ${room.ko}`}
            >
              <span className="w-6 shrink-0 text-right text-[10px] text-[var(--muted)]">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">{room.label}</span>
                <span className="mt-0.5 block truncate text-[10px] text-[var(--muted)]">{room.ko}</span>
              </span>
            </button>
          ))}
          {!visible.length ? <div className="px-3 py-6 text-center text-xs text-[var(--muted)]">찾는 Room이 없습니다. Anything / Custom Room을 선택하세요.</div> : null}
        </div>
      </div>
    </aside>
  );
}
