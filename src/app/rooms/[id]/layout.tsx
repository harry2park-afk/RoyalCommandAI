import type { ReactNode } from "react";
import ChatHistorySidebar from "./ChatHistorySidebar";
import RightWorkSidebar from "./RightWorkSidebar";

export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <ChatHistorySidebar />
      <div className="royal-room-main min-w-0 flex-1">
        <style>{`.royal-room-main > main { max-width: none !important; margin-left: 0 !important; margin-right: 0 !important; }`}</style>
        {children}
      </div>
      <RightWorkSidebar />
    </div>
  );
}
