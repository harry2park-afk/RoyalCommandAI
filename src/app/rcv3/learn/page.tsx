import {redirect} from 'next/navigation';
import {session} from '@/lib/rcv3/access';
import {accountAnswerLanguage} from '@/lib/rcv3/answer-language';
import LearningRoom from './LearningRoom';
export const dynamic='force-dynamic';
export default async function Page(){
 const ctx=await session().catch(e=>{if(e instanceof Error&&e.message==='RCV3_AUTH')redirect('/login?next=%2Frcv3%2Flearn');throw e;});
 return <LearningRoom language={await accountAnswerLanguage(ctx)}/>;
}
