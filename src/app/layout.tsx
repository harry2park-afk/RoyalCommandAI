import type { Metadata } from "next";
import RetellRoomVoiceBridge from "@/components/RetellRoomVoiceBridge";
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
      </body>
    </html>
  );
}
