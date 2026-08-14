import type { ReactNode } from "react";
import ChatHistorySidebar from "./ChatHistorySidebar";
import RightWorkSidebar from "./RightWorkSidebar";

function SponsoredCard({ side }: { side: "left" | "right" }) {
  const sideClass = side === "left"
    ? "left-0 rounded-r-2xl border-l-0"
    : "right-0 rounded-l-2xl border-r-0";

  return (
    <a
      href="/"
      className={`fixed bottom-2 z-[120] hidden min-h-[104px] w-[210px] border border-[var(--gold)]/25 bg-[#07111f]/95 p-3 shadow-xl backdrop-blur lg:block ${sideClass}`}
      aria-label={`${side === "left" ? "왼쪽" : "오른쪽"} 스폰서 광고 영역`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--gold-soft)]">Sponsored</div>
      <div className="mt-1 text-sm font-semibold">광고 영역</div>
      <div className="mt-1 text-[10px] leading-4 text-[var(--muted)]">광고 네트워크 연결 후 고객이 눌러 상품·서비스를 확인하는 자리입니다.</div>
    </a>
  );
}

export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <div className="royal-room-layout flex min-h-screen w-full">
      <ChatHistorySidebar />
      <SponsoredCard side="left" />
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
          .royal-room-layout > aside:first-child > button:last-child {
            right: 4px !important;
            transform: translateY(-50%) !important;
            border-left: 1px solid rgb(255 255 255 / 0.2) !important;
            border-radius: 12px !important;
          }
          .royal-room-layout > aside:last-child {
            display: flex !important;
            min-height: 0 !important;
            flex-direction: column !important;
            border-left: 0 !important;
          }
          .royal-room-layout button[title="오른쪽 패널 닫기"] {
            position: absolute !important;
            left: 4px !important;
            right: auto !important;
            transform: translateY(-50%) !important;
            border-right: 1px solid rgb(255 255 255 / 0.2) !important;
            border-radius: 12px !important;
          }
        `}</style>
        {children}
      </div>
      <RightWorkSidebar />
      <SponsoredCard side="right" />
    </div>
  );
}
