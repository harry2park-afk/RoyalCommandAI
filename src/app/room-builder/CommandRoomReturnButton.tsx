"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CommandRoomReturnButton() {
  const router = useRouter();
  const [returnRoom, setReturnRoom] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnRoom(params.get("returnRoom") || "");
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push(returnRoom ? `/rooms/${encodeURIComponent(returnRoom)}` : "/dashboard")}
      className="fixed left-4 top-4 z-[9999] rounded-xl border border-[var(--gold)]/70 bg-black/85 px-4 py-2 text-sm font-semibold text-[var(--gold-soft)] shadow-lg backdrop-blur hover:border-[var(--gold)] hover:bg-black"
      aria-label="Back to Command Room"
    >
      ← Command Room
    </button>
  );
}
