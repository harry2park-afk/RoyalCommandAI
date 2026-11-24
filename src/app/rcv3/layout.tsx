import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import MobileInstall from "./MobileInstall";
export const metadata: Metadata = {
  applicationName: "Royal Command",
  manifest: "/rcv3/app.webmanifest",
  appleWebApp: { capable: true, title: "RC", statusBarStyle: "default" },
  icons: { apple: "/rcv3/app-icon?size=192" },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: "#09131e", interactiveWidget: "resizes-content",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  return <><MobileInstall />{children}</>;
}
