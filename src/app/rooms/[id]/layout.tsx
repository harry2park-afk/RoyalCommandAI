import type { ReactNode } from "react";
import ChatHistorySidebar from "./ChatHistorySidebar";
import RightWorkSidebar from "./RightWorkSidebar";

export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <div className="royal-room-layout flex min-h-screen w-full">
      <ChatHistorySidebar />
      <a
        href="/"
        className="fixed bottom-2 left-0 z-40 hidden min-h-[104px] w-[210px] rounded-r-2xl border border-l-0 border-[var(--gold)]/25 bg-[#07111f]/95 p-3 shadow-xl backdrop-blur lg:block"
        aria-label="왼쪽 스폰서 광고 영역"
      >
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--gold-soft)]">Sponsored</div>
        <div className="mt-1 text-sm font-semibold">광고 영역</div>
        <div className="mt-1 text-[10px] leading-4 text-[var(--muted)]">광고 네트워크 연결 후 고객이 눌러 상품·서비스를 확인하는 자리입니다.</div>
      </a>
      <div className="royal-room-main min-w-0 flex-1">
        <style>{`
          .royal-room-main > main {
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .royal-room-main > main > div.grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .royal-room-main > main > div.grid > aside {
            display: none !important;
          }
          .royal-room-layout > aside:first-child {
            border-right: 0 !important;
          }
          .royal-room-layout > aside:last-child {
            display: flex !important;
            min-height: 100vh !important;
            flex-direction: column !important;
            border-left: 0 !important;
          }
        `}</style>
        {children}
      </div>
      <RightWorkSidebar />
    </div>
  );
}
