import {redirect} from 'next/navigation';
import {session} from '@/lib/rcv3/access';
import {accountAnswerLanguage} from '@/lib/rcv3/answer-language';
import {learningCountry,learningRegionUrl} from '@/lib/rcv3/learning/regions';
import LearningRoom from './LearningRoom';
import {learningLanguage,learningLanguages} from '@/lib/locale/learning';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{language?:string;country?:string}>}){
 const query=await searchParams;
 const ctx=await session().catch(e=>{if(e instanceof Error&&e.message==='RCV3_AUTH')redirect(`/login?next=${encodeURIComponent(learningRegionUrl(query.language??'en',query.country))}`);throw e;});
 const language=query.language&&learningLanguages.includes(query.language as typeof learningLanguages[number])?query.language:learningLanguage(await accountAnswerLanguage(ctx));
 return <LearningRoom key={`${ctx.user.id}:${language}`} ownerId={ctx.user.id} language={language} country={learningCountry(query.country)?.id??learningCountry(ctx.user.countryCode)?.id??''}/>;
}
