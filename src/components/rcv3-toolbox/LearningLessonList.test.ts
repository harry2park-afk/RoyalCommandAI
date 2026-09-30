import React from 'react';
import {expect,it,vi} from 'vitest';
import LearningLessonList from './LearningLessonList';
function nodes(v:unknown):React.ReactElement<Record<string,any>>[]{if(Array.isArray(v))return v.flatMap(nodes);if(!React.isValidElement(v))return [];const e=v as React.ReactElement<Record<string,any>>;return [e,...nodes(e.props.children)];}
it('all 60 numbered controls invoke their own lesson number and reflect selection/completion',()=>{
 vi.stubGlobal('React',React);const onStart=vi.fn();const tree=nodes(LearningLessonList({language:'ko',count:60,selected:27,completed:[1],disabled:false,onStart}));const buttons=tree.filter(n=>n.type==='button');expect(buttons).toHaveLength(60);
 buttons.forEach((b,i)=>{b.props.onClick();expect(onStart).toHaveBeenLastCalledWith(i+1);});expect(buttons[26].props['aria-pressed']).toBe(true);expect(buttons[0].props['aria-label']).toContain('완료');
});
