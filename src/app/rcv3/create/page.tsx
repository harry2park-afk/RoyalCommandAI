import { notFound, redirect } from "next/navigation";
import { session } from "@/lib/rcv3/access";
import { AI_PROVIDER_IDS, PROVIDER_LABELS } from "@/lib/ai/types";
import CreateRoomWizard from "./CreateRoomWizard";
import { accountAnswerLanguage } from "@/lib/rcv3/answer-language";
export const dynamic = "force-dynamic";
export default async function CreateRoomPage() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  let language = "en";
  let accountEmail = "", country = "";
  try { const context = await session(); language = await accountAnswerLanguage(context); accountEmail = context.user.email; country = context.user.countryCode; }
  catch (e) { if (e instanceof Error && e.message === "RCV3_AUTH") redirect("/login?next=%2Frcv3%2Fcreate"); throw e; }
  return <CreateRoomWizard language={language} accountEmail={accountEmail} country={country} providers={AI_PROVIDER_IDS.map(id => ({ id, label: PROVIDER_LABELS[id] }))}/>;
}
