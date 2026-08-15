"use client";

import { useEffect } from "react";

export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Royal Command Room render error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07101d] p-6 text-[#f4f0e7]">
      <div className="w-full max-w-lg rounded-2xl border border-[#d7b64d]/50 bg-[#0b1524] p-6 text-center shadow-2xl">
        <h1 className="text-xl font-semibold">Royal Command Room 복구 중</h1>
        <p className="mt-3 text-sm text-[#b8c1cf]">화면 오류를 감지했습니다. 채팅 기록은 유지됩니다.</p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={() => reset()} className="rounded-lg bg-[#d7b64d] px-4 py-2 text-sm font-semibold text-[#111827]">다시 열기</button>
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-white/15 px-4 py-2 text-sm">새로고침</button>
        </div>
      </div>
    </main>
  );
}
