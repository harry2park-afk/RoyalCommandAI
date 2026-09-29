import {z} from 'zod';
import {session,input,reply,failure} from '@/lib/rcv3/access';
import {accountAnswerLanguage} from '@/lib/rcv3/answer-language';
import {publicLearningContent,translatedLearningContent} from '@/lib/rcv3/learning/content';
import {learningLanguages,learningLanguage} from '@/lib/locale/learning';
export const maxDuration=60;
const schema=z.object({day:z.number().int().min(1).max(30),language:z.enum(learningLanguages).optional()}).strict();
export async function POST(request:Request){try{
 const ctx=await session(),body=schema.parse(await input(request,500));
 const language=body.language??learningLanguage(await accountAnswerLanguage(ctx));
 const source=publicLearningContent(body.day,[],language);
 return reply({language,day:body.day,text:await translatedLearningContent(ctx.user.id,language,source)});
 }catch(error){return failure(error);}}
