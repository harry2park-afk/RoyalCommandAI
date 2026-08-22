import type { ReactNode } from "react";
import RoomBuilderScrollUnlock from "./RoomBuilderScrollUnlock";
import CommandRoomReturnButton from "./CommandRoomReturnButton";
import RoomBuilderGuide from "./RoomBuilderGuide";
import RoomDirectoryPicker from "./RoomDirectoryPicker";

export default function RoomBuilderLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RoomBuilderScrollUnlock />
      <CommandRoomReturnButton />
      <RoomDirectoryPicker />
      <RoomBuilderGuide />
      {children}
    </>
  );
}
