import type { ReactNode } from "react";
import ChatHistorySidebar from "./ChatHistorySidebar";

export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <ChatHistorySidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
