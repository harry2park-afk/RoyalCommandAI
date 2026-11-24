import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {trialAccess,defaultTrialProfile} from "@/lib/rooms/room6-trial";
import {AI_PROVIDER_IDS,PROVIDER_LABELS} from "@/lib/ai/types";
import {isProviderConfigured} from "@/lib/ai/connectors";
import {isDomainFeatureReady} from "@/config/countryResolver";
import {getServerDomainRuntimeContext} from "@/lib/runtime/serverDomainContext";
import StartTrial from "./StartTrial";
import TrialChat from "./TrialChat";
export const dynamic="force-dynamic";
export default async function TrialPage(){
 if(process.env.VERCEL_ENV!=="preview"&&process.env.NODE_ENV!=="development")notFound();
 let a;try{a=await trialAccess(false);}catch(e){if(e instanceof Error&&e.message==="TRIAL_AUTH")redirect("/login?next=%2Froom6%2Ftrial");throw e;}
 const runtime=await getServerDomainRuntimeContext();
 const providers=runtime&&isDomainFeatureReady(runtime,"ai")?AI_PROVIDER_IDS.filter(isProviderConfigured).map(id=>({id,label:PROVIDER_LABELS[id]})):[];
 return <main className="min-h-screen bg-[#07111f] p-5 text-white"><Link href="/room6" className="text-amber-200">← 내 방</Link><h1 className="my-4 text-2xl">Room6 · 새 시험방</h1><p className="mb-4 text-sm text-amber-200">Preview · 실제 기능 검증 중</p>{a.room?<TrialChat roomId={a.roomId} providers={providers} initialProfile={defaultTrialProfile(a.user.countryCode,a.user.defaultLanguage)}/>:<StartTrial/>}</main>;
}
