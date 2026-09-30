'use client';
import {learningLabel,learningLanguage} from '@/lib/locale/learning';
import {learningCountries,learningCountry,learningPrices,type LearningPrice} from '@/lib/rcv3/learning/regions';
type Props={language:string;country:string;disabled:boolean;onChange:(language:string,country:string)=>void};
export default function LearningRegion({language,country,disabled,onChange}:Props){
 const locale=learningLanguage(language),t=(key:Parameters<typeof learningLabel>[0])=>learningLabel(key,locale);
 const region=learningCountry(country),prices=learningPrices(country);
 const names=new Intl.DisplayNames([locale],{type:'region'});
 const price=(value:LearningPrice)=>`${new Intl.NumberFormat(locale,{style:'currency',currency:value.currency,currencyDisplay:'code'}).format(value.amount)}${value.basis==='usd-reference'?` · ${t('regionReference')}`:''}`;
 return <section aria-label={t('regionSettings')}>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
   <label>{t('regionCountry')}<select value={region?.id??''} disabled={disabled} onChange={e=>onChange(locale,e.target.value)}>
    <option value="">{t('regionChoose')}</option>
    {learningCountries.map(c=><option key={c.id} value={c.id}>{names.of(c.id)??c.label}</option>)}
   </select></label>
   <label>{t('regionLanguage')}<select value={locale} disabled={disabled} onChange={e=>onChange(e.target.value,country)}>
    <option value="en">English</option><option value="ko">한국어</option><option value="ja">日本語</option><option value="zh">简体中文</option><option value="hi">हिन्दी</option>
   </select></label>
  </div>
  <p>{t('regionIndependent')}</p>
  {region&&<div aria-live="polite">
   <h2>{t('regionPriceHeading')}</h2>
   <p><strong>{t('regionCourse')}: {price(prices.course)}</strong><br/>{t('regionRoom')}: {price(prices.room)}</p>
   {(prices.course.basis==='usd-reference'||prices.room.basis==='usd-reference')&&<p>{t('regionFxPending')} ({region.currencyCode})</p>}
   <p>{t('regionPricePending')}</p>
   <p>{t('regionTerm')}</p>
   <p>{t('regionCertificate')}</p>
  </div>}
 </section>;
}
