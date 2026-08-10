import type { ReactNode } from "react";
import TranslationBar from "./TranslationBar";
import CompactChatControls from "./CompactChatControls";

export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TranslationBar />
      <CompactChatControls />
      {children}
    </>
  );
}
