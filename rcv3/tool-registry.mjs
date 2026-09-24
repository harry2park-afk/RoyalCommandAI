export const TOOL_REGISTRY = Object.freeze([
  {id:'toolbox',label:'Toolbox',version:1,mode:'shared',entry:'src/components/rcv3-toolbox/Toolbox.tsx'},
  {id:'create-room',label:'Create Room',version:1,mode:'shared',entry:'src/app/rcv3/RoomCatalog.tsx'},
  {id:'room-list',label:'My Rooms',version:1,mode:'shared',entry:'src/app/rcv3/MobileInstall.tsx'},
  {id:'personal-ai',label:'My AI Account',version:1,mode:'shared',entry:'src/app/rcv3/PersonalAI.tsx'},
  {id:'ai-list',label:'AI List',version:1,mode:'shared',entry:'src/app/rcv3/Room.tsx'},
  {id:'chat',label:'My AI',version:1,mode:'room-button',capability:'chat',entry:'src/app/rcv3/Room.tsx'},
  {id:'secretary',label:'Katie',version:1,mode:'room-button',capability:'secretary',entry:'src/app/rcv3/Room.tsx'},
  {id:'files',label:'Files',version:1,mode:'room-button',capability:'files',entry:'src/app/rcv3/Room.tsx'},
  {id:'microphone',label:'Microphone',version:1,mode:'shared',entry:'rcv3/voice-control.mjs'},
  {id:'send',label:'Send',version:1,mode:'shared',entry:'rcv3/send-control.mjs'},
  {id:'speaker',label:'Speaker',version:1,mode:'shared',entry:'src/app/rcv3/AnswerCards.tsx'},
  {id:'copy-answer',label:'Copy',version:1,mode:'shared',entry:'src/components/rcv3-toolbox/CopyText.tsx'},
  {id:'helper',label:'AI Helper',version:1,mode:'shared',entry:'src/components/help/HelpText.tsx'},
  {id:'edit-buttons',label:'Edit Buttons',version:1,mode:'shared',entry:'src/app/rcv3/Room.tsx'},
  {id:'background',label:'Room Background',version:1,mode:'shared',entry:'src/app/rcv3/Room.tsx'},
  {id:'learning',label:'AI Learning Room',version:1,mode:'shared',entry:'src/app/rcv3/learn/LearningRoom.tsx'},
  {id:'meetings',label:'Meeting Room',version:1,mode:'shared',entry:'src/app/rcv3/meetings/MeetingPreview.tsx'},
  {id:'translation',label:'Meeting Translation',version:1,mode:'shared',entry:'src/app/rcv3/meetings/MeetingTranslation.tsx'},
]);

export function roomInstallableTools(){
  return TOOL_REGISTRY.filter(tool=>tool.mode==='room-button');
}
