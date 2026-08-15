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

          /* Keep the Command Room sign visually separated from Dashboard */
          .royal-room-main main > div.fixed > div:first-child > h1 {
            margin-left: 44px !important;
          }

          /* Hide extra brand/status/region labels to keep header simple */
          .royal-room-main [data-rc-brand],
          .royal-room-main [data-rc-global-status] {
            display: none !important;
          }

          /* Royal Command chat palette */
          .royal-room-main section {
            background: #0B1524 !important;
          }
          .royal-room-main button[title="클릭하면 전체 내용을 봅니다"] {
            background: #E0BC4F !important;
            color: #101827 !important;
            border: 1px solid #F3D36A !important;
          }
          .royal-room-main section article {
            background: #0F1B2C !important;
            color: #F4F0E7 !important;
            border-color: #26374D !important;
          }
          .royal-room-main textarea[placeholder="Type or speak your order…"] {
            color: #F4F0E7 !important;
          }
          .royal-room-main textarea[placeholder="Type or speak your order…"]::placeholder {
            color: #71829A !important;
          }

          /* AI OPEN / OFF boxes — Royal blue OFF, velvet red OPEN */
          .royal-room-main main > div.fixed > div:nth-child(2) > button:not([title^="AI Warehouse"]) {
            position: relative !important;
            overflow: hidden !important;
            background: #1E3A8A !important;
            color: #FFD700 !important;
            border: 3px solid #FFD700 !important;
            border-radius: 8px !important;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,.05) !important;
            transition: background .2s ease, color .2s ease, box-shadow .2s ease !important;
          }
          .royal-room-main main > div.fixed > div:nth-child(2) > button:not([title^="AI Warehouse"]):disabled {
            opacity: .35 !important;
            filter: grayscale(.35) !important;
          }
          .royal-room-main main > div.fixed > div:nth-child(2) > button[class*="bg-[#d7b64d]"]:not([title^="AI Warehouse"]) {
            background: #7A0C2E !important;
            color: #FFF3D6 !important;
            border-color: #FFD700 !important;
            box-shadow: 0 0 9px rgba(255,215,0,.38), inset 0 0 12px rgba(255,255,255,.05) !important;
          }
          .royal-room-main main > div.fixed > div:nth-child(2) > button[class*="bg-[#d7b64d]"]:not([title^="AI Warehouse"])::after {
            content: "";
            position: absolute;
            inset: 2px;
            pointer-events: none;
            background:
              radial-gradient(circle at 12% 28%, #FFD700 0 1.5px, transparent 2px),
              radial-gradient(circle at 29% 72%, #FFFFFF 0 1.3px, transparent 2px),
              radial-gradient(circle at 48% 22%, #FFD700 0 1.2px, transparent 2px),
              radial-gradient(circle at 67% 68%, #FFFFFF 0 1.5px, transparent 2px),
              radial-gradient(circle at 86% 31%, #FFD700 0 1.4px, transparent 2px),
              radial-gradient(circle at 78% 82%, #FFFFFF 0 1.1px, transparent 2px),
              radial-gradient(circle at 38% 47%, #FFD700 0 1.1px, transparent 2px);
            animation: rc-ai-twinkle 1.4s ease-in-out infinite;
          }
          @keyframes rc-ai-twinkle {
            0%, 100% { opacity: .22; transform: scale(.98); }
            50% { opacity: 1; transform: scale(1.02); }
          }
        `}</style>
        {children}
      </div>
      <RightWorkSidebar />
      <SponsoredCard side="right" />
    </div>
  );
}
