import type { Metadata } from "next";
import Script from "next/script";
import RetellRoomVoiceBridge from "@/components/RetellRoomVoiceBridge";
import RoomPreferenceAuthority from "@/components/RoomPreferenceAuthority";
import "./globals.css";
import "./room-viewport-tight.css";

export const metadata: Metadata = {
  title: "RoyalCommand.ai — Royal Household OS",
  description:
    "A secure AI operating system for individuals, families and businesses. Neutral Rooms. Multi-AI orchestration.",
};

const ROOM_UI_VERSION = "20260818-2245";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        {children}
        <RetellRoomVoiceBridge />
        <RoomPreferenceAuthority />
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
      </body>
    </html>
  );
}
