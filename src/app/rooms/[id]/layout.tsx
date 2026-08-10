import type { ReactNode } from "react";
import TranslationBar from "./TranslationBar";
import CompactChatControls from "./CompactChatControls";
import WorkspaceShell from "./WorkspaceShell";

export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShell>
      <TranslationBar />
      <CompactChatControls />
      {children}
    </WorkspaceShell>
  );
}
