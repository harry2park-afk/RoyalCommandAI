'use client';
import {learningLabel} from '@/lib/locale/learning';
import styles from './LearningLessonList.module.css';
export default function LearningLessonList({language,count,selected,completed,disabled,onStart}:{language:string;count:number;selected:number;completed:readonly number[];disabled:boolean;onStart:(number:number)=>void}){
 const t=(key:Parameters<typeof learningLabel>[0])=>learningLabel(key,language);
 return <section className={styles.list} aria-label={t('lessonList')}>
  <h2>{t('lessonList')}</h2><p>{t('lessonListHint')}</p>
  <div className={styles.numbers}>{Array.from({length:count},(_,i)=>i+1).map(n=><button key={n} type="button" disabled={disabled} aria-pressed={selected===n} aria-label={`${t('lessonNumber')} ${n}${completed.includes(n)?` · ${t('m5')}`:''}`} onClick={()=>onStart(n)}>{n}{completed.includes(n)&&<small aria-hidden="true"> ✓</small>}</button>)}</div>
 </section>;
}
