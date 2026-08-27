import Script from "next/script";
import RoomPage from "../[id]/page";

export default function RCARoomPage() {
  return (
    <>
      <Script src="/rca-fetch-bridge.js" strategy="beforeInteractive" />
      <RoomPage />
    </>
  );
}
