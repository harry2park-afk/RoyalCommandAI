import type { Metadata } from "next";
import Script from "next/script";
import CustomerRoomDesigner from "@/components/CustomerRoomDesigner";
import SecureProtectedLayoutEditor from "@/components/SecureProtectedLayoutEditor";
import RetellRoomVoiceBridge from "@/components/RetellRoomVoiceBridge";
import RoomPreferenceAuthority from "@/components/RoomPreferenceAuthority";
import ScopedRoomHeaderStyleAuthority from "@/components/ScopedRoomHeaderStyleAuthority";
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
        <Script src="/rca-fetch-bridge.js" strategy="beforeInteractive" />
        <Script src="/rca-ui-seed.js" strategy="beforeInteractive" />
        {children}
        <RetellRoomVoiceBridge />
        <RoomPreferenceAuthority />
        <ScopedRoomHeaderStyleAuthority />
        <CustomerRoomDesigner />
        <SecureProtectedLayoutEditor />
      </body>
    </html>
  );
}
