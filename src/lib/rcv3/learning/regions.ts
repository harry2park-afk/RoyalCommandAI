import {COUNTRY_ROOM_PRESETS} from '@/lib/rooms/countryPresets';
import {learningLanguage} from '@/lib/locale/learning';

// Presentation configuration only. Never use a URL-selected country as billing authority.
export const learningCountries=COUNTRY_ROOM_PRESETS;
export function learningCountry(value:unknown){
 return typeof value==='string'?learningCountries.find(p=>p.id===value.toUpperCase())??null:null;
}
export type LearningPrice={currency:string;amount:number;basis:'fixed'|'usd-reference'};
export function learningPrices(country:unknown):{course:LearningPrice;room:LearningPrice}{
 const code=learningCountry(country)?.id;
 const fixed=(currency:string,amount:number):LearningPrice=>({currency,amount,basis:'fixed'});
 const reference=(amount:number):LearningPrice=>({currency:'USD',amount,basis:'usd-reference'});
 if(code==='AU')return {course:fixed('AUD',16.5),room:fixed('AUD',6.5)};
 if(code==='US')return {course:fixed('USD',15),room:fixed('USD',6)};
 if(code==='GB')return {course:fixed('GBP',11.5),room:reference(6)};
 return {course:reference(15),room:reference(6)};
}
// Input is an exact decimal FX result, never a binary floating-point calculation.
// Round to 0.50 currency units, or whole units for zero-decimal payment currencies.
export function roundLearningPrice(decimal:string,zeroDecimal=false):string{
 if(!/^(0|[1-9]\d{0,11})(\.\d{1,12})?$/.test(decimal))throw new Error('INVALID_PRICE');
 const [whole,fraction='']=decimal.split('.');
 const scale=BigInt(10)**BigInt(fraction.length);
 const value=BigInt(whole)*scale+BigInt(fraction||'0');
 const units=zeroDecimal?BigInt(1):BigInt(2);
 const rounded=(value*units+scale-BigInt(1))/scale;
 return zeroDecimal?String(rounded):`${rounded/BigInt(2)}.${rounded%BigInt(2)?'50':'00'}`;
}
export function learningRegionUrl(language:string,country:unknown){
 const query=new URLSearchParams({language:learningLanguage(language)}),region=learningCountry(country);
 if(region)query.set('country',region.id);
 return `/rcv3/learn?${query}`;
}
