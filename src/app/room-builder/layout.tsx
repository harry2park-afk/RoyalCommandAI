import type { ReactNode } from "react";
import RoomBuilderScrollUnlock from "./RoomBuilderScrollUnlock";

export default function RoomBuilderLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RoomBuilderScrollUnlock />
      {children}
    </>
  );
}
