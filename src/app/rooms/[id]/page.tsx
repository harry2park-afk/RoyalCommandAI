import Script from "next/script";
import StableRoomV3 from "./StableRoomV3";
import RoomExternalAppClickGuard from "./RoomExternalAppClickGuard";
import ServerConversationBridge from "./ServerConversationBridge";
import RightMenuPasteFix from "./RightMenuPasteFix";
import SpeakerTtsBridge from "./SpeakerTtsBridge";

const ROOM_UI_VERSION = "20260821-room-switcher";

export default function RoomPage() {
  return (
    <>
      <style>{`
        .royal-room-main main > div.fixed:first-of-type {
          background: linear-gradient(180deg, #2a3c33 0%, #273a33 100%) !important;
        }
        html:not([data-rc-room-enhanced="1"]) .royal-room-main main > div.fixed:first-of-type > div:first-child > h1 {
          font-size: 0 !important;
          margin-left: 32px !important;
        }
        html:not([data-rc-room-enhanced="1"]) .royal-room-main main > div.fixed:first-of-type > div:first-child > h1::after {
          content: "Royal Command AI";
          font-family: "Times New Roman", serif;
          font-size: 20px;
          font-weight: 600;
          line-height: 1;
          color: #f4f0e7;
          white-space: nowrap;
        }
        html:not([data-rc-room-enhanced="1"]) .royal-room-main main > div.fixed:first-of-type > div:first-child > div.min-w-0.flex-1 {
          visibility: hidden !important;
        }
        html:not([data-rc-room-enhanced="1"]) .royal-room-main main > div.fixed:first-of-type > div:first-child select[aria-label="Language"] {
          visibility: hidden !important;
        }
        html:not([data-rc-room-enhanced="1"]) .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) {
          gap: 10px !important;
          justify-content: flex-start !important;
          overflow: hidden !important;
          padding-left: 10px !important;
          padding-right: 10px !important;
        }
        html:not([data-rc-room-enhanced="1"]) .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:last-child {
          order: -1 !important;
          flex: 0 0 auto !important;
          width: auto !important;
          min-width: 116px !important;
          height: 30px !important;
          margin-left: 0 !important;
          border-width: 1px !important;
        }
        html:not([data-rc-room-enhanced="1"]) .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:not(:last-child) {
          flex: 0 0 auto !important;
          width: auto !important;
          min-width: 0 !important;
          height: 30px !important;
          padding: 2px 6px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          white-space: nowrap !important;
        }
        html:not([data-rc-room-enhanced="1"]) .royal-room-main main > div.fixed:first-of-type > div:nth-child(2) > button:not([class*="bg-[#7A0C2E]"]):not(:last-child) {
          display: none !important;
        }

        .royal-room-main button[data-speaker-control="true"] {
          transform: translateY(46px) !important;
        }

        #rc-new-chat-button,
        #rc-voice-command-button {
          height: 30px !important;
          min-height: 30px !important;
          max-height: 30px !important;
          border-width: 1px !important;
          border-color: #2A3B6E !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }

        /* One purpose per voice control: composer mic = speech input, speaker = speech output.
           The old left Voice button duplicated the composer microphone and was hard-coded to Korean. */
        #rc-voice-command-button {
          display: none !important;
        }
        #rc-new-chat-button {
          grid-column: 1 / -1 !important;
          width: 100% !important;
        }

        aside button[title="Delete this conversation"] {
          display: none !important;
        }
      `}</style>

      <RoomExternalAppClickGuard />
      <ServerConversationBridge />
      <RightMenuPasteFix />
      <SpeakerTtsBridge />
      <StableRoomV3 />
      <Script src={`/rc-room-switcher.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-language-picker.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-copy-question-thread.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-question-rules-v2.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-command-room-english.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-chat-scroll-unlock.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-new-chat-label.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-compact-ai-dock.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-language-dock-fix.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-room-title-v2.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-sidebar-actions-compact.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-compact-conversation-rows.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script id="rc-room-enhanced-marker" strategy="afterInteractive">
        {`document.documentElement.setAttribute("data-rc-room-enhanced", "1");`}
      </Script>
    </>
  );
}
