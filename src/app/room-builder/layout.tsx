import type { ReactNode } from "react";
import RoomBuilderScrollUnlock from "./RoomBuilderScrollUnlock";
import CommandRoomReturnButton from "./CommandRoomReturnButton";
import RoomBuilderGuide from "./RoomBuilderGuide";
import AustraliaLegalLocale from "./AustraliaLegalLocale";

export default function RoomBuilderLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RoomBuilderScrollUnlock />
      <CommandRoomReturnButton />
      <AustraliaLegalLocale />
      <RoomBuilderGuide />
      {children}
    </>
  );
}
