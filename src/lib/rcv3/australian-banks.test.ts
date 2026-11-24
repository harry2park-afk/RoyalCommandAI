import {describe,expect,it} from 'vitest';
import {majorAustralianBanks,orderedAustralianBanks,bankNames,verifiedBankSites} from './australian-banks';

describe('Australian customer bank picker',()=>{
 it('shows the requested major banks first and keeps each institution once',()=>{
  expect(orderedAustralianBanks.slice(0,5)).toEqual([
   'Commonwealth Bank of Australia','Westpac Banking Corporation',
   'National Australia Bank Limited','Australia and New Zealand Banking Group Limited',
   'Macquarie Bank Limited'
  ]);
  expect(new Set(orderedAustralianBanks).size).toBe(orderedAustralianBanks.length);
  for(const name of ['St.George Bank','National Australia Bank Limited','Macquarie Bank Limited']) {
   expect(majorAustralianBanks).toContain(name);
   expect(verifiedBankSites[name]).toMatch(/^https:\/\//);
  }
  expect(bankNames['National Australia Bank Limited']).toBe('NAB');
  expect(bankNames['St.George Bank']).toContain('Westpac group');
 });
});
