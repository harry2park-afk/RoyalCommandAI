import Script from "next/script";
import RoomV3 from "./RoomV3";

const ROOM_UI_VERSION = "20260818-2305-route";

export default function RoomPage() {
  return (
    <>
      <RoomV3 />
      <Script src={`/rc-language-picker.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-copy-question-thread.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-question-rules-v2.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-command-room-english.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-chat-thread-workflow.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-english-only-sidebar-titles.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-new-chat-label.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-compact-ai-dock.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-language-dock-fix.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
      <Script src={`/rc-room-title-v2.js?v=${ROOM_UI_VERSION}`} strategy="afterInteractive" />
    </>
  );
}
