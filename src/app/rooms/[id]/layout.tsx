import type { ReactNode } from "react";
import RoomIncidentMonitor from "@/components/RoomIncidentMonitor";
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
      <RoomIncidentMonitor />
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

          /* Local top-AI marks. Visual only: state/click remains owned by RoomV3. */
          .royal-room-main main > div.fixed > div:nth-child(2) > button:not(:last-child) {
            position: relative !important;
            overflow: hidden !important;
          }
          .royal-room-main main > div.fixed > div:nth-child(2) > button:not(:last-child) > span:first-child {
            background-position: center !important;
            background-repeat: no-repeat !important;
            background-size: 18px 18px !important;
          }
          .royal-room-main main > div.fixed > div:nth-child(2) > button:not(:last-child) > span:first-child > * {
            display: none !important;
          }
          .royal-room-main button[title^="ChatGPT"] > span:first-child { background-image:url('/rc-ai-logos/openai.svg') !important; }
          .royal-room-main button[title^="Claude"] > span:first-child { background-image:url('/rc-ai-logos/anthropic.svg') !important; }
          .royal-room-main button[title^="Gemini"] > span:first-child { background-image:url('/rc-ai-logos/gemini.svg') !important; }
          .royal-room-main button[title^="Grok"] > span:first-child { background-image:url('/rc-ai-logos/xai.svg') !important; }
          .royal-room-main button[title^="DeepSeek"] > span:first-child { background-image:url('/brand-logos/deepseek.svg') !important; }
          .royal-room-main button[title^="Perplexity"] > span:first-child { background-image:url('/rc-ai-logos/perplexity.svg') !important; }
          .royal-room-main button[title^="Mistral"] > span:first-child { background-image:url('/rc-ai-logos/mistral.svg') !important; }
          .royal-room-main button[title^="Meta Llama"] > span:first-child { background-image:url('/rc-ai-logos/meta.svg') !important; }
          .royal-room-main button[title^="Qwen"] > span:first-child { background-image:url('/rc-ai-logos/qwen.svg') !important; }
          .royal-room-main button[title^="Cohere"] > span:first-child { background-image:url('/brand-logos/cohere.svg') !important; }

          /* Selected AI sparkle: stable CSS only, no DOM observer. */
          @keyframes rcAiLogoTwinkle {
            0%, 100% { filter: brightness(1) drop-shadow(0 0 1px rgba(255,215,0,.25)); transform: scale(1); }
            50% { filter: brightness(1.55) drop-shadow(0 0 7px rgba(255,215,0,.95)); transform: scale(1.12); }
          }
          @keyframes rcAiStarTwinkle {
            0%, 100% { opacity: .20; transform: scale(.55) rotate(0deg); }
            50% { opacity: 1; transform: scale(1.25) rotate(45deg); }
          }
          .royal-room-main main > div.fixed > div:nth-child(2) > button[class*="bg-[#7A0C2E]"]:not([title^="DeepSeek"]):not([title^="Cohere"]):not(:last-child) > span:first-child {
            animation: rcAiLogoTwinkle 1.15s ease-in-out infinite !important;
            transform-origin: center !important;
          }
          .royal-room-main main > div.fixed > div:nth-child(2) > button[class*="bg-[#7A0C2E]"]:not([title^="DeepSeek"]):not([title^="Cohere"]):not(:last-child)::before,
          .royal-room-main main > div.fixed > div:nth-child(2) > button[class*="bg-[#7A0C2E]"]:not([title^="DeepSeek"]):not([title^="Cohere"]):not(:last-child)::after {
            content: "✦";
            position: absolute;
            z-index: 5;
            pointer-events: none;
            color: #FFD700;
            text-shadow: 0 0 6px #FFD700, 0 0 10px rgba(255,255,255,.7);
            animation: rcAiStarTwinkle 1.05s ease-in-out infinite;
          }
          .royal-room-main main > div.fixed > div:nth-child(2) > button[class*="bg-[#7A0C2E]"]:not([title^="DeepSeek"]):not([title^="Cohere"]):not(:last-child)::before {
            left: 8px;
            top: 3px;
            font-size: 8px;
            animation-delay: .12s;
          }
          .royal-room-main main > div.fixed > div:nth-child(2) > button[class*="bg-[#7A0C2E]"]:not([title^="DeepSeek"]):not([title^="Cohere"]):not(:last-child)::after {
            right: 7px;
            bottom: 2px;
            font-size: 7px;
            animation-delay: .55s;
          }
          @media (prefers-reduced-motion: reduce) {
            .royal-room-main main > div.fixed > div:nth-child(2) > button > span:first-child,
            .royal-room-main main > div.fixed > div:nth-child(2) > button::before,
            .royal-room-main main > div.fixed > div:nth-child(2) > button::after {
              animation: none !important;
            }
          }
        `}</style>
        {children}
      </div>
      <RightWorkSidebar />
      <SponsoredCard side="right" />
    </div>
  );
}
