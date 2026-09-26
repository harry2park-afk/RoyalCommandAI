import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {roomTemplates,templateImage} from './templates';
describe('published room artwork',()=>{
 it('has forty-nine distinct local assets with no executable or remote URLs',()=>{
  expect(roomTemplates).toHaveLength(49);
  expect(new Set(roomTemplates.map(t=>t.id)).size).toBe(49);
  for(const t of roomTemplates){const image=templateImage(t);expect(image).toMatch(/^\/room-designs\/[a-z0-9-]+\.webp$/);expect(existsSync(`public${image}`)).toBe(true);}
 });
});
