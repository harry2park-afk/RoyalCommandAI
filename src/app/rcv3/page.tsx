import { notFound, redirect } from "next/navigation";
import { session } from "@/lib/rcv3/access";
import { getAvailableProviderIds } from "@/lib/ai/connectors";
import { PROVIDER_LABELS } from "@/lib/ai/types";
import Room from "./Room";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  try { await session(); } catch(e) { if (e instanceof Error && e.message === "RCV3_AUTH") redirect("/login?next=%2Frcv3"); throw e; }
  return <Room providers={getAvailableProviderIds().map(id => ({ id, label: PROVIDER_LABELS[id] }))} />;
}
