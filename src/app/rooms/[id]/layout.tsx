import type { ReactNode } from "react";
import RoomIncidentMonitor from "@/components/RoomIncidentMonitor";
import ChatHistorySidebar from "./ChatHistorySidebar";
import RightWorkSidebar from "./RightWorkSidebar";

export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <div className="royal-room-layout flex min-h-screen w-full">
      <RoomIncidentMonitor />
      <ChatHistorySidebar />
      <div className="royal-room-main min-w-0 flex-1 overflow-hidden">
        <style>{`
          .royal-room-main > main {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
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
            border-left: 4px solid #FFD700 !important;
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

          /* Mobile / phone landscape Command Room layout. Desktop remains unchanged. */
          @media (max-width: 1200px) {
            .royal-room-layout {
              width: 100vw !important;
              min-width: 0 !important;
              overflow: hidden !important;
            }
            .royal-room-layout > aside:not(:last-child) {
              display: none !important;
            }
            .royal-room-layout > aside:last-child {
              display: flex !important;
              width: 48px !important;
              min-width: 48px !important;
              max-width: 48px !important;
              transition: width .16s ease, min-width .16s ease, max-width .16s ease !important;
            }
            .royal-room-layout > aside:last-child[data-mobile-expanded="true"] {
              width: 150px !important;
              min-width: 150px !important;
              max-width: 150px !important;
            }
            .royal-room-layout > aside:last-child .rc-right-search {
              display: none !important;
            }
            .royal-room-layout > aside:last-child .rc-right-menu {
              padding-left: 2px !important;
              padding-right: 2px !important;
              padding-top: 4px !important;
            }
            .royal-room-layout > aside:last-child .rc-right-row {
              height: 42px !important;
              min-height: 42px !important;
              justify-content: center !important;
            }
            .royal-room-layout > aside:last-child .rc-right-app-button {
              justify-content: center !important;
              gap: 0 !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            .royal-room-layout > aside:last-child .rc-right-app-title,
            .royal-room-layout > aside:last-child .rc-right-remove {
              display: none !important;
            }
            .royal-room-layout > aside:last-child[data-mobile-expanded="true"] .rc-right-app-button {
              justify-content: flex-start !important;
              gap: 8px !important;
              padding-left: 8px !important;
              padding-right: 6px !important;
            }
            .royal-room-layout > aside:last-child[data-mobile-expanded="true"] .rc-right-app-title {
              display: block !important;
              font-size: 11px !important;
            }
            .royal-room-main {
              width: auto !important;
              max-width: none !important;
              min-width: 0 !important;
              flex: 1 1 auto !important;
            }
            .royal-room-main > main {
              width: 100% !important;
              max-width: 100% !important;
              min-width: 0 !important;
              padding-top: 88px !important;
            }
            .royal-room-main main > div.fixed:first-of-type {
              left: 0 !important;
              right: 48px !important;
              width: auto !important;
              height: 88px !important;
            }
            .royal-room-layout:has(> aside:last-child[data-mobile-expanded="true"]) .royal-room-main main > div.fixed:first-of-type {
              right: 150px !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:first-child {
              height: 40px !important;
              padding-left: 6px !important;
              padding-right: 6px !important;
              gap: 4px !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:first-child > a {
              width: 24px !important;
              min-width: 24px !important;
              overflow: hidden !important;
              font-size: 0 !important;
              white-space: nowrap !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:first-child > a::before {
              content: "←";
              font-size: 16px !important;
              color: #d7b64d !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:first-child > h1 {
              margin-left: 0 !important;
              font-size: 15px !important;
              white-space: nowrap !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:first-child > div:nth-of-type(1) {
              display: none !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:first-child > div:last-child {
              margin-left: auto !important;
              min-width: 0 !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:first-child select {
              max-width: 104px !important;
              height: 30px !important;
              padding-left: 5px !important;
              padding-right: 4px !important;
              font-size: 11px !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) {
              height: 48px !important;
              gap: 3px !important;
              overflow: hidden !important;
              padding: 6px 5px !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:nth-child(n+7):not(:last-child) {
              display: none !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:not(:last-child) {
              flex: 1 1 54px !important;
              min-width: 38px !important;
              max-width: 72px !important;
              width: auto !important;
              height: 34px !important;
              gap: 2px !important;
              padding-left: 2px !important;
              padding-right: 2px !important;
              font-size: 9px !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:not(:last-child) > span:first-child {
              width: 18px !important;
              height: 18px !important;
              min-width: 18px !important;
              background-size: 16px 16px !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:not(:last-child) > span:last-child {
              transform: none !important;
              font-size: 9px !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:last-child {
              flex: 0 0 60px !important;
              min-width: 60px !important;
              width: 60px !important;
              height: 34px !important;
              margin-left: auto !important;
              padding-left: 3px !important;
              padding-right: 3px !important;
              gap: 2px !important;
              font-size: 0 !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:last-child span {
              display: none !important;
            }
            .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:last-child::after {
              content: "AI창고";
              font-size: 8px !important;
              line-height: 1 !important;
            }
            .royal-room-main main section {
              width: 100% !important;
              min-width: 0 !important;
            }
            .royal-room-main main section article {
              max-width: 100% !important;
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
              font-size: 14px !important;
              line-height: 1.55 !important;
            }
            .royal-room-main main section form textarea {
              min-height: 66px !important;
              max-height: 110px !important;
              font-size: 16px !important;
              padding: 8px !important;
            }
            .royal-room-main main section form > div:last-child {
              border-radius: 14px 14px 0 0 !important;
              padding: 7px !important;
            }
            .royal-room-main main section form div.flex.min-w-0.items-center {
              gap: 7px !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            .royal-room-main main section form button[type="submit"] {
              height: 40px !important;
              padding-left: 14px !important;
              padding-right: 14px !important;
              font-size: 13px !important;
            }
            .royal-room-main main > div[class*="z-[210]"] {
              justify-content: flex-end !important;
              align-items: stretch !important;
              padding: 0 !important;
              padding-top: 88px !important;
              padding-right: 48px !important;
              background: rgba(0,0,0,.58) !important;
            }
            .royal-room-main main > div[class*="z-[210]"] > div {
              width: min(82vw, 380px) !important;
              max-width: 380px !important;
              max-height: calc(100dvh - 88px) !important;
              height: calc(100dvh - 88px) !important;
              border-radius: 16px 0 0 0 !important;
              border-right: 0 !important;
            }
            .royal-room-main main > div[class*="z-[210]"] > div > div:last-child {
              grid-template-columns: 1fr !important;
              padding: 10px !important;
            }
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
    </div>
  );
}
