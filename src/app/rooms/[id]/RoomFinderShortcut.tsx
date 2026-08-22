"use client";

import { useParams } from "next/navigation";

export default function RoomFinderShortcut() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id || "";
  const href = `/room-builder${roomId ? `?returnRoom=${encodeURIComponent(roomId)}` : ""}`;

  return (
    <a
      href={href}
      id="rc-room-finder-shortcut"
      className="fixed right-[190px] top-[147px] z-[320] inline-flex h-[34px] items-center gap-2 rounded-lg border border-[#d9b44a] bg-[#7A0C2E] px-3 text-xs font-bold text-[#fff4c2] shadow-[0_0_14px_rgba(217,180,74,.4)] transition hover:bg-[#94113a]"
      title="Room 찾기"
    >
      <span aria-hidden="true">🔎</span>
      <span>Room 찾기</span>
    </a>
  );
}
