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
        <Script src="/rc-language-picker.js" strategy="afterInteractive" />
        <Script src="/rc-copy-question-thread.js" strategy="afterInteractive" />
        <Script src="/rc-question-rules-v2.js" strategy="afterInteractive" />
        <Script src="/rc-command-room-english.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
