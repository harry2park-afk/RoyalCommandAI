import {notFound,redirect} from 'next/navigation';
import {session} from '@/lib/rcv3/access';
import {learningRegionUrl} from '@/lib/rcv3/learning/regions';
import {ownCertificate} from '@/lib/rcv3/learning/store';
import {accountAnswerLanguage} from '@/lib/rcv3/answer-language';
import {learningLabel,learningLanguage,type LearningLabel} from '@/lib/locale/learning';
import PrintButton from '../PrintButton';
import styles from '../../learn.module.css';
export const dynamic='force-dynamic';
export default async function CertificatePage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{language?:string;country?:string;entry?:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))notFound();
 const ctx=await session().catch(e=>{if(e instanceof Error&&e.message==='RCV3_AUTH')redirect(`/login?next=${encodeURIComponent('/rcv3/learn/certificate/'+id)}`);throw e;});
 const c=await ownCertificate(ctx.user.id,id);if(!c)notFound();
 const query=await searchParams;const language=learningLanguage(query.language||await accountAnswerLanguage(ctx));const t=(key:LearningLabel)=>learningLabel(key,language);
 return <main className={styles.certificate} lang={language}><p>ROYAL COMMAND</p><h1>{t("certificateTitle")}</h1><p>{t("certificateCourse")}</p><p>{t("certifies")}</p><h2>{c.name}</h2><p>{t("certificateBody")}</p><p>{t("finalScore")} <strong>{c.score} / 100</strong> · {t("passMark")} 70</p><p>{t("issued")} {new Date(c.issuedAt).toLocaleDateString(language,{timeZone:'Australia/Sydney',year:'numeric',month:'long',day:'numeric'})}</p><p>{t("certificateId")}<br/><code>{c.id}</code></p><footer>{t("certificateNote")}</footer><nav><a href={learningRegionUrl(language,query.country,query.entry==='v4'?'/rcv4/learn':'/rcv3/learn')}>← {t("title")}</a><PrintButton language={language}/></nav></main>;
}
