import {redirect} from 'next/navigation';
import {session} from '@/lib/rcv3/access';
import {accountAnswerLanguage} from '@/lib/rcv3/answer-language';
import {learningCountry,learningRegionUrl} from '@/lib/rcv3/learning/regions';
import LearningRoom from '@/app/rcv3/learn/LearningRoom';
import {learningLanguage,learningLanguages} from '@/lib/locale/learning';
import {PRACTICAL_COURSE} from '@/lib/rcv3/learning/practical-60';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{language?:string;country?:string}>}){
 const query=await searchParams;
 const ctx=await session().catch(e=>{if(e instanceof Error&&e.message==='RCV3_AUTH')redirect(`/login?next=${encodeURIComponent(learningRegionUrl(query.language??'en',query.country,'/rcv4/learn'))}`);throw e;});
 const language=query.language&&learningLanguages.includes(query.language as typeof learningLanguages[number])?query.language:learningLanguage(await accountAnswerLanguage(ctx));
 // Preview course has isolated local drafts; never load or reassign legacy assessment records.
 const initialLearning={state:{completed:[],certificate:null},practice:[]};
 return <LearningRoom curriculumId={PRACTICAL_COURSE} initialLearning={initialLearning} entryPath="/rcv4/learn" homeHref="https://rc-v4-model-room.harry2park.chatgpt.site" key={`${ctx.user.id}:${language}`} ownerId={ctx.user.id} language={language} country={learningCountry(query.country)?.id??learningCountry(ctx.user.countryCode)?.id??''}/>;
}
