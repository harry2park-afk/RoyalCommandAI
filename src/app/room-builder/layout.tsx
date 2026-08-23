import type { ReactNode } from "react";
import RoomBuilderScrollUnlock from "./RoomBuilderScrollUnlock";
import CommandRoomReturnButton from "./CommandRoomReturnButton";
import RoomBuilderAIFormAssistant from "./RoomBuilderAIFormAssistant";
import RoomGuideLiveInputMirror from "./RoomGuideLiveInputMirror";

export default function RoomBuilderLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RoomBuilderScrollUnlock />
      <CommandRoomReturnButton />
      <RoomBuilderAIFormAssistant />
      <RoomGuideLiveInputMirror />
      {children}
    </>
  );
}
