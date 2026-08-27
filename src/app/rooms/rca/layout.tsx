import type { ReactNode } from "react";
import RoomLayout from "../[id]/layout";

export default function RCARoomLayout({ children }: { children: ReactNode }) {
  return <RoomLayout>{children}</RoomLayout>;
}
