import {describe,it,expect} from 'vitest';
import {roomTemplates,templateImage} from './templates';
describe('room gallery visual presets',()=>{
 it('has unique selectable identities and bounded self-contained illustrations',()=>{
  expect(new Set(roomTemplates.map(t=>t.id)).size).toBe(roomTemplates.length);
  for(const t of roomTemplates){const image=templateImage(t);if(t.id==='blank'){expect(image).toBe('');continue;}expect(image.length).toBeLessThan(1300000);const svg=decodeURIComponent(image.split(',')[1]);expect(svg).toContain('<svg');expect(svg).not.toMatch(/<script|onload|href=|foreignObject/i);}
 });
});
