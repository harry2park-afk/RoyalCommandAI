// Shared browser/server allowlist. Customer configuration never supplies code,
// URLs, permissions or handlers. Existing capability IDs remain unchanged.
const entries = /** @type {const} */ ([
  {id:'chat',label:'My AI',description:'Open this room’s AI conversation.',requires:'Select an available AI before sending.',source:'src/app/rcv3/Room.tsx'},
  {id:'secretary',label:'Katie',description:'Open your secretary with this room’s own connections.',requires:'Secretary access and your own account connections.',source:'src/app/rcv3/Room.tsx'},
  {id:'files',label:'Files',description:'Open the text files saved in this room.',requires:'Access to this room.',source:'src/app/rcv3/Room.tsx'},
  {id:'ai-list',label:'AI List',description:'Choose and arrange the AIs used by this room.',requires:'An available provider and the room’s existing usage allowance.',source:'src/app/rcv3/Room.tsx'},
  {id:'personal-ai',label:'My AI account',description:'Open the existing list of external AI websites in a new tab.',requires:'Sign in to your own account on the external website.',source:'src/app/rcv3/PersonalAI.tsx'},
  {id:'microphone',label:'Microphone',description:'Use the existing microphone to write in the message box.',requires:'Microphone permission and the existing audio service.',source:'rcv3/voice-control.mjs'},
  {id:'send',label:'Send',description:'Send the current message using this room’s selected AIs.',requires:'A message, selected AI and available usage allowance.',source:'src/app/rcv3/Room.tsx'},
  {id:'speaker',label:'Speaker',description:'Turn the most recent answer’s existing speaker on or off.',requires:'An AI answer and the existing audio service.',source:'src/app/rcv3/AnswerCards.tsx'},
  {id:'copy-answer',label:'Copy',description:'Copy the most recent AI answer to your clipboard.',requires:'An AI answer and browser clipboard permission.',source:'src/components/rcv3-toolbox/CopyText.tsx'},
  {id:'helper',label:'AI Helper',description:'Open help for this room and its tools.',requires:'Help text is available immediately; translation requires a connection.',source:'src/components/help/HelpText.tsx'},
  {id:'learning',label:'AI Learning Room',description:'Open the existing course, tutor, assignments and certificate.',requires:'Your signed-in account. Existing course limits apply.',source:'src/app/rcv3/learn/LearningRoom.tsx'},
  {id:'meetings',label:'Meetings',description:'Open meeting backgrounds, camera preview and meeting translation.',requires:'Camera or microphone permission for the selected feature. This is a local preview, not a meeting call.',source:'src/app/rcv3/meetings/MeetingPreview.tsx'},
  {id:'create-room',label:'Create Room',description:'Create a room in one column with purpose-based design and feature suggestions, account-language prompts and server-verified pricing.',requires:'Existing price, account and payment conditions apply.',source:'src/app/rcv3/create/CreateRoomWizard.tsx'},
  {id:'room-list',label:'My Rooms',description:'Choose from your existing rooms.',requires:'Your signed-in account.',source:'src/app/rcv3/Room.tsx'},
  {id:'background',label:'Background',description:'Choose a PNG, JPG or WebP background for this room.',requires:'An image under 950KB. Save the room design to keep the change.',source:'src/app/rcv3/Room.tsx'},
  {id:'edit-buttons',label:'Edit Buttons',description:'Move, resize, recolour, rename or remove installed buttons.',requires:'Save or cancel your current edits first.',source:'src/app/rcv3/Room.tsx'},
  {id:'upload-file',label:'Add Text File',description:'Add a TXT, MD or CSV file to this room.',requires:'A text file under 100KB and access to this room.',source:'src/app/rcv3/Room.tsx'},
  {id:'toolbox',label:'Toolbox',description:'RC-managed shared tools for approved installation.',requires:'Harry’s authenticated RC owner account and authorization. Customers cannot install directly.',source:'src/components/rcv3-toolbox/Toolbox.tsx'},
  {id:'payment',label:'Payment',description:'Open payment guidance and the existing room subscription payment page.',requires:'Your own RC order. Server-confirmed payment is required before paid tools can run.',source:'src/components/rcv3-toolbox/PaymentGate.tsx'},
]);
export const TOOL_REGISTRY = Object.freeze(entries.map(entry => Object.freeze({...entry,version:'1.0.0'})));
export const TOOL_IDS = Object.freeze(entries.map(entry => entry.id));
/** @param {string} id */
export function getTool(id) {
  const tool = TOOL_REGISTRY.find(entry => entry.id === id);
  if (!tool) throw new Error('UNKNOWN_TOOL');
  return tool;
}
/** Return only portable design, never a connection or an entitlement.
 * @param {string} toolId @param {string} id @param {number} [index]
 */
export function createToolButton(toolId,id,index=0) {
  const tool = getTool(toolId);
  return {id,capability:tool.id,label:tool.label,x:5+(index%3)*30,y:5+(Math.floor(index/3)%7)*13,width:24,height:11,opacity:1};
}
