import Script from "next/script";
import StableRoomV3 from "./StableRoomV3";
import RoomExternalAppClickGuard from "./RoomExternalAppClickGuard";
import ServerConversationBridge from "./ServerConversationBridge";
import RightMenuPasteFix from "./RightMenuPasteFix";
import SpeakerTtsBridge from "./SpeakerTtsBridge";
import NativeSynthesisButton from "./NativeSynthesisButton";

const ROOM_UI_VERSION = "20260829-legal-speaker-recovery";

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

        /* Room manager: keep the three dots, replace only the rectangular border with a gear outline. */
        #rc-room-shortcut-manager {
          border: 0 !important;
          border-radius: 0 !important;
          background-color: transparent !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z' fill='none' stroke='%23bcae8d' stroke-width='.72' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          background-size: 30px 30px !important;
          box-shadow: none !important;
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

        /* Readability pass: use the full centre width and size AI answers for two readable cards plus a third-card preview. */
        .royal-room-main main section > div:first-child {
          padding-left: 0 !important;
          padding-right: 0 !important;
          padding-top: 2px !important;
        }
        .royal-room-main main section > div:first-child > div[class*="mx-auto"][class*="mt-8"][class*="text-center"] {
          display: none !important;
        }
        .royal-room-main main section > div:first-child > article[class*="whitespace-pre-wrap"] {
          width: 100% !important;
          height: clamp(220px, calc((100dvh - 290px) / 2.25), 340px) !important;
          min-height: clamp(220px, calc((100dvh - 290px) / 2.25), 340px) !important;
          overflow: hidden !important;
          cursor: pointer !important;
          padding-left: 12px !important;
          padding-right: 12px !important;
        }
        .royal-room-main main section > div:first-child > article[data-rc-ai-answer-expanded="true"] {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
        .royal-room-main main form textarea {
          height: 82px !important;
          min-height: 82px !important;
          max-height: 120px !important;
        }
      `}</style>

      <RoomExternalAppClickGuard />
      <ServerConversationBridge />
      <RightMenuPasteFix />
      <SpeakerTtsBridge />
      <NativeSynthesisButton />
      <StableRoomV3 />
      <Script id="rc-ai-answer-expand" strategy="afterInteractive">
        {`(() => {
          if (window.__rcAiAnswerExpandV1) return;
          window.__rcAiAnswerExpandV1 = true;
          const selector = '.royal-room-main main section > div:first-child > article[class*="whitespace-pre-wrap"]';
          const mark = () => {
            document.querySelectorAll(selector).forEach((node) => {
              if (!(node instanceof HTMLElement)) return;
              node.tabIndex = 0;
              node.setAttribute('role', 'button');
              node.setAttribute('aria-expanded', node.dataset.rcAiAnswerExpanded === 'true' ? 'true' : 'false');
              node.title = node.dataset.rcAiAnswerExpanded === 'true' ? 'Click to close full answer' : 'Click to open full answer';
            });
          };
          const toggle = (node) => {
            const expanded = node.dataset.rcAiAnswerExpanded === 'true';
            node.dataset.rcAiAnswerExpanded = expanded ? 'false' : 'true';
            node.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            node.title = expanded ? 'Click to open full answer' : 'Click to close full answer';
          };
          document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const answer = target.closest(selector);
            if (!(answer instanceof HTMLElement)) return;
            toggle(answer);
          }, true);
          document.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const answer = target.closest(selector);
            if (!(answer instanceof HTMLElement)) return;
            event.preventDefault();
            toggle(answer);
          }, true);
          mark();
          const observer = new MutationObserver(mark);
          observer.observe(document.documentElement, { childList: true, subtree: true });
        })();`}
      </Script>
      <Script src={`/rc-room-switcher.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-room-manager.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script id="rc-room-manager-fixed-position" strategy="afterInteractive">
        {`(() => {
          const move = () => {
            const header = document.querySelector('.royal-room-main main > div.fixed:first-of-type > div:first-child');
            const title = header?.querySelector('h1');
            const manager = document.getElementById('rc-room-shortcut-manager');
            if (!(header instanceof HTMLElement) || !(title instanceof HTMLElement) || !(manager instanceof HTMLElement)) return;
            if (title.nextElementSibling !== manager) title.insertAdjacentElement('afterend', manager);
          };
          move();
          const observer = new MutationObserver(move);
          observer.observe(document.documentElement, { childList: true, subtree: true });
        })();`}
      </Script>
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