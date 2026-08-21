"use client";

import { MouseEvent, PointerEvent, useEffect, useState } from "react";

export default function CommandRoomReturnButton() {
  const [returnRoom, setReturnRoom] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnRoom(params.get("returnRoom") || "");
  }, []);

  function stopEvent(event: PointerEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  }

  function goToCommandRoom(event: MouseEvent<HTMLButtonElement>) {
    stopEvent(event);
    const targetPath = returnRoom ? `/rooms/${encodeURIComponent(returnRoom)}` : "/dashboard";
    const targetUrl = new URL(targetPath, window.location.origin);
    if (targetUrl.origin !== window.location.origin) return;
    window.location.assign(targetUrl.toString());
  }

  return (
    <button
      type="button"
      onPointerDown={stopEvent}
      onPointerUp={stopEvent}
      onClick={goToCommandRoom}
      className="fixed left-4 top-4 z-[9999] rounded-xl border border-[var(--gold)]/70 bg-black/85 px-4 py-2 text-sm font-semibold text-[var(--gold-soft)] shadow-lg backdrop-blur hover:border-[var(--gold)] hover:bg-black"
      aria-label="Back to Command Room"
    >
      ← Command Room
    </button>
  );
}
