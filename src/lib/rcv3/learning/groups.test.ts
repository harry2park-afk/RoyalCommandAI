import {expect,it} from 'vitest';
import {groups,completedGroupCount,sourceDay} from './groups';
import {lessons} from './course';
it('covers all existing work exactly once in 60 groups over 30 days',()=>{expect(groups).toHaveLength(60);expect(groups.flatMap(g=>g.sources).sort()).toEqual(lessons.map(l=>l.id));for(let day=1;day<=30;day++)expect(groups.filter(g=>g.day===day)).toHaveLength(2);});
it('only completes a group when all preserved parts pass',()=>{expect(completedGroupCount(['001'])).toBe(0);expect(completedGroupCount(['001','002'])).toBe(1);expect(completedGroupCount(lessons.map(l=>l.id))).toBe(60);expect(sourceDay('100')).toBe(30);});
