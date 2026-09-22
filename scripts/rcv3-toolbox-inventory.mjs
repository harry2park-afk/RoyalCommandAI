// Scoped registration gate: changed/new V3 controls must be inventoried before a
// build. This verifies registration coverage, never live functional correctness.
import ts from 'typescript';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TOOL_REGISTRY} from '../rcv3/tool-registry.mjs';
const owners={
 'src/app/rcv3/Room.tsx':'toolbox',
 'src/app/rcv3/AnswerCards.tsx':'speaker',
 'src/app/rcv3/PersonalAI.tsx':'personal-ai',
 'src/app/rcv3/MobileInstall.tsx':'room-list',
 'src/app/rcv3/RoomCatalog.tsx':'create-room',
 'src/app/rcv3/create/CheckoutPanel.tsx':'create-room',
 'src/app/rcv3/create/CreateRoomWizard.tsx':'create-room',
 'src/app/rcv3/create/CustomerConnections.tsx':'create-room',
 'src/app/rcv3/create/CustomerPhoneSetup.tsx':'create-room',
 'src/app/rcv3/learn/LearningRoom.tsx':'learning',
 'src/app/rcv3/learn/certificate/PrintButton.tsx':'learning',
 'src/app/rcv3/meetings/MeetingPreview.tsx':'meetings',
 'src/app/rcv3/meetings/MeetingTranslation.tsx':'meetings',
 'src/components/rcv3-toolbox/Toolbox.tsx':'toolbox',
 'src/components/rcv3-toolbox/CopyText.tsx':'copy-answer',
 'src/components/rcv3-toolbox/ToolButton.tsx':'toolbox',
 'src/components/help/HelpText.tsx':'helper',
};
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(`${dir}/${entry.name}`):entry.name.endsWith('.tsx')?[`${dir}/${entry.name}`]:[]);
const entries=[];
for(const file of [...files('src/app/rcv3'),...files('src/components/rcv3-toolbox'),'src/components/help/HelpText.tsx'].sort()){
 const source=readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let index=0;
 function visit(node){
  if((ts.isJsxElement(node)&&['button','ToolButton','CopyText'].includes(node.openingElement.tagName.getText(ast)))||(ts.isJsxSelfClosingElement(node)&&['ToolButton','CopyText'].includes(node.tagName.getText(ast)))){
   const owner=owners[file];if(!TOOL_REGISTRY.some(tool=>tool.id===owner))throw new Error(`Register control owner before use: ${file}`);
   const code=node.getText(ast),hash=createHash('sha256').update(code).digest('hex');
   entries.push({controlId:`${file}#${++index}`,toolId:owner,sourceHash:hash,mode:'context-bound',note:'Reuse through the owning component and its state/handlers; never copy markup alone.'});
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);
}
const voice=readFileSync('rcv3/voice-control.mjs','utf8');entries.push({controlId:'rcv3/voice-control.mjs#toggle',toolId:'microphone',sourceHash:createHash('sha256').update(voice).digest('hex'),mode:'shared-custom-element',note:'Reuse rc-voice-control.toggle(); do not bypass its events.'});
const content=JSON.stringify({scope:'RC V3 and its shared toolbox/help controls; legacy RC remains isolated',entries},null,2)+'\n';
const path='docs/rcv3/TOOL_CONTROL_INVENTORY.json';
if(process.argv.includes('--write'))writeFileSync(path,content);
else if(readFileSync(path,'utf8')!==content)throw new Error('RC V3 control inventory changed. Register/review the shared functionality, run node scripts/rcv3-toolbox-inventory.mjs --write, and verify the action before committing.');
console.log(`${entries.length} registered control definitions; ${TOOL_REGISTRY.length} installable tools. Registration is not live execution evidence.`);
