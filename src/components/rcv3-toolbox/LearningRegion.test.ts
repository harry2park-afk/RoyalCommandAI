import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import LearningRegion from './LearningRegion';
vi.stubGlobal('React',React);
it('shows correct currencies with localized planned-price and access disclosure',()=>{
 const html=renderToStaticMarkup(React.createElement(LearningRegion,{language:'ko',country:'AU',disabled:false,onChange:()=>{}}));
 expect(html).toContain('AUD');expect(html).toContain('16.50');expect(html).toContain('6.50');expect(html).toContain('예정');expect(html).toContain('아직 연결 전');expect(html).not.toContain('USD');
 const uk=renderToStaticMarkup(React.createElement(LearningRegion,{language:'en',country:'GB',disabled:false,onChange:()=>{}}));
 expect(uk).toContain('GBP');expect(uk).toContain('11.50');expect(uk).toContain('USD');expect(uk).toContain('USD reference');expect(uk).toContain('Local-currency pricing is pending');
});
it('localizes requested languages and never invents local FX prices',()=>{
 for(const language of ['en','ko','ja','zh','hi']){
  const html=renderToStaticMarkup(React.createElement(LearningRegion,{language,country:'JP',disabled:true,onChange:()=>{}}));
  expect(html).toContain('USD');expect(html).toContain('JPY');expect(html).toContain('disabled=""');
 }
});
