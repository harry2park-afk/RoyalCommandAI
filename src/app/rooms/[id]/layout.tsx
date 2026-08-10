import type { ReactNode } from "react";
import TranslationBar from "./TranslationBar";

export default function RoomLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TranslationBar />
      {children}
    </>
  );
}
