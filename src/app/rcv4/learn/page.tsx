import {redirect} from 'next/navigation';
import {session} from '@/lib/rcv3/access';
import {accountAnswerLanguage} from '@/lib/rcv3/answer-language';
import {learningCountry,learningRegionUrl} from '@/lib/rcv3/learning/regions';
import LearningRoom from '@/app/rcv3/learn/LearningRoom';
import {learningLanguage,learningLanguages} from '@/lib/locale/learning';
import {learningState} from '@/lib/rcv3/learning/store';
import {lessons} from '@/lib/rcv3/learning/course';
import {practiceQuestion,publicQuestion} from '@/lib/rcv3/learning/questions';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{language?:string;country?:string}>}){
 const query=await searchParams;
 const ctx=await session().catch(e=>{if(e instanceof Error&&e.message==='RCV3_AUTH')redirect(`/login?next=${encodeURIComponent(learningRegionUrl(query.language??'en',query.country,'/rcv4/learn'))}`);throw e;});
 const [language,state]=await Promise.all([
  query.language&&learningLanguages.includes(query.language as typeof learningLanguages[number])?query.language:accountAnswerLanguage(ctx).then(learningLanguage),
  learningState(ctx.user.id).catch(()=>undefined),
 ]);
 // Request-local owner data avoids a second client authentication/progress trip.
 // A storage failure retains the existing client retry rather than fake progress.
 const initialLearning=state?{state,practice:lessons.map(l=>publicQuestion(practiceQuestion(l.id)))}:undefined;
 return <LearningRoom initialLearning={initialLearning} entryPath="/rcv4/learn" homeHref="https://rc-v4-model-room.harry2park.chatgpt.site" key={`${ctx.user.id}:${language}`} ownerId={ctx.user.id} language={language} country={learningCountry(query.country)?.id??learningCountry(ctx.user.countryCode)?.id??''}/>;
}
