import type { ReactNode } from "react";
import Script from "next/script";
import RoomLayout from "../../rooms/[id]/layout";

export default function RCALayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script src="/rca-fetch-bridge.js" strategy="beforeInteractive" />
      <RoomLayout>{children}</RoomLayout>
    </>
  );
}
