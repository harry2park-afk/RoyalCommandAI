"use client";

import Link from "next/link";
import { useRoyalCommandLocale } from "../rooms/[id]/useRoyalCommandLocale";
import { katieVoiceText } from "@/lib/locale/katie-voice";

export default function SecretaryHeader({ roomName, backHref, roomsHref, fromV3 }: {
  roomName?: string; backHref: string; roomsHref: string; fromV3: boolean;
}) {
  const locale = useRoyalCommandLocale();
  return <header className="mx-auto grid max-w-[1180px] gap-3 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
    <Link href={backHref} className="w-fit rounded-lg border border-[#d7b64d]/50 px-4 py-2 text-[#f0d36a]">← {fromV3 ? "RC V3" : "Command Room"}</Link>
    <div className="min-w-0">
      <h1 className="break-words text-xl font-semibold">Katie{roomName ? ` · ${roomName}` : ""}</h1>
      {roomName ? <Link href={roomsHref} className="mt-1 inline-block text-sm text-[#f0d36a]">{katieVoiceText("rooms", locale)}</Link> : null}
    </div>
  </header>;
}
