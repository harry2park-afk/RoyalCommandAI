import type { ReactNode } from "react";
import RoomBuilderScrollUnlock from "./RoomBuilderScrollUnlock";
import CommandRoomReturnButton from "./CommandRoomReturnButton";
import RoomBuilderAIFormAssistant from "./RoomBuilderAIFormAssistant";

export default function RoomBuilderLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        aside.fixed textarea::placeholder {
          color: transparent !important;
        }
        aside.fixed form > div:last-child {
          display: none !important;
        }
      `}</style>
      <RoomBuilderScrollUnlock />
      <CommandRoomReturnButton />
      <RoomBuilderAIFormAssistant />
      {children}
    </>
  );
}
