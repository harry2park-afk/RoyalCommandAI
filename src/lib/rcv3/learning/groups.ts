import groups from './groups.json';
export {groups};
export function groupForSource(id:string){const group=groups.find(g=>g.sources.includes(id));if(!group)throw Error('UNKNOWN_LESSON');return group;}
export function groupComplete(group:typeof groups[number],completed:readonly string[]){return group.sources.every(id=>completed.includes(id));}
export function completedGroupCount(completed:readonly string[]){return groups.filter(g=>groupComplete(g,completed)).length;}
export function sourceDay(id:string){return groupForSource(id).day;}
