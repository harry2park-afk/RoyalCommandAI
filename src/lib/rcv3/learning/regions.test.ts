import {expect,it} from 'vitest';
import {learningCountry,learningPrices,roundLearningPrice,learningRegionUrl} from './regions';
it('keeps owner fixed prices and marks missing FX as reference, never a local quote',()=>{
 expect(learningPrices('AU')).toEqual({course:{currency:'AUD',amount:16.5,basis:'fixed'},room:{currency:'AUD',amount:6.5,basis:'fixed'}});
 expect(learningPrices('US').room.amount).toBe(6);
 expect(learningPrices('GB').course).toEqual({currency:'GBP',amount:11.5,basis:'fixed'});
 expect(learningPrices('GB').room.basis).toBe('usd-reference');
 for(const c of ['KR','JP','CN','IN','NZ','CA','IE','SG','ZA']){expect(learningCountry(c)).toBeTruthy();expect(learningPrices(c).course).toEqual({currency:'USD',amount:15,basis:'usd-reference'});}
 expect(learningCountry('bad')).toBeNull();
});
it('rounds exact decimal amounts upward without changing exact boundaries',()=>{
 for(const [source,want] of [['6','6.00'],['6.3','6.50'],['6.5','6.50'],['6.7','7.00'],['6.500000000001','7.00'],['0.01','0.50']])expect(roundLearningPrice(source)).toBe(want);
 expect(roundLearningPrice('110.2',true)).toBe('111');
 for(const invalid of ['-1','NaN','Infinity','1e3','', '1.0000000000001'])expect(()=>roundLearningPrice(invalid)).toThrow();
});
it('keeps language and country independent and excludes unrecognized input from URLs',()=>{
 expect(learningRegionUrl('ko','AU')).toBe('/rcv3/learn?language=ko&country=AU');
 expect(learningRegionUrl('en','AU')).toBe('/rcv3/learn?language=en&country=AU');
 expect(learningRegionUrl('ja','bad')).toBe('/rcv3/learn?language=ja');
});
