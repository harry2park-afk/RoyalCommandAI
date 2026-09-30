'use client';
import {useRef} from 'react';
import {learningLabel} from '@/lib/locale/learning';
import styles from './LearningLessonList.module.css';
export default function LearningLessonList({language,titles,selected,completed,disabled,onStart}:{language:string;titles:readonly string[];selected:number;completed:readonly number[];disabled:boolean;onStart:(number:number)=>void}){
 const dialog=useRef<HTMLDialogElement|null>(null);
 const t=(key:Parameters<typeof learningLabel>[0])=>learningLabel(key,language);
 return <section className={styles.list} aria-label={t('lessonList')}>
  <button type="button" disabled={disabled} aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}>{t('lessonList')}</button>
  <dialog ref={dialog} className={styles.dialog} aria-label={t('lessonList')}>
   <div className={styles.heading}><h2>{t('lessonList')}</h2><button type="button" onClick={()=>dialog.current?.close()}>Close</button></div>
   <p>{t('lessonListHint')}</p>
   <div className={styles.rows}>{titles.map((title,i)=>{const n=i+1;return <button key={n} type="button" disabled={disabled} aria-pressed={selected===n} title={title} onClick={()=>{dialog.current?.close();onStart(n);}}><span>{t('lessonNumber')} {n}{completed.includes(n)?` · ✓ ${t('m5')}`:''}</span><strong>{title}</strong></button>;})}</div>
  </dialog>
 </section>;
}
