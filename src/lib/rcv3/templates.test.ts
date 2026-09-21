import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {roomTemplates,templateImage} from './templates';
describe('published room artwork',()=>{
 it('has distinct local assets with no executable or remote URLs',()=>{
  expect(roomTemplates.filter(t=>t.category === "RC Office")).toHaveLength(10);
  expect(new Set(roomTemplates.map(t=>t.id)).size).toBe(roomTemplates.length);
  for(const t of roomTemplates){const image=templateImage(t);expect(image).toMatch(/^\/room-designs\/[a-z0-9-]+\.(webp|png)$/);expect(existsSync(`public${image}`)).toBe(true);}
 });
});
