import type { ReactNode } from "react";
import RCAConnectionManager from "./RCAConnectionManager";

export default function RCARoomLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <RCAConnectionManager />
    </>
  );
}
