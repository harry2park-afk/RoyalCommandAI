// Reuses RC's existing customer design schema; no provider/execution imports.
import {sanitiseCustomerRoomDesignConfig} from '../src/lib/customer-room-designer.ts';
const allowed=new Set(['offsetX','offsetY','width','height','fontSize','label','borderColor','backgroundColor','colourStrength','textColor','borderWidth','borderRadius']);
export function validateButtonAppearance(input){
 if(!input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).some(key=>!allowed.has(key)))throw new Error('INVALID_APPEARANCE');
 const out=sanitiseCustomerRoomDesignConfig({screenId:'ROOM_HEADER',elements:{control:input}}).elements.control;
 if(Object.keys(input).some(key=>!(key in out)&&key!=='borderWidth'))throw new Error('INVALID_APPEARANCE');
 // Legacy editor starts at 1px; new controls explicitly allow an invisible border.
 if(input.borderWidth===0)out.borderWidth=0;
 else if('borderWidth' in input&&!Number.isFinite(input.borderWidth))throw new Error('INVALID_APPEARANCE');
 return Object.freeze(out);
}
export function applyButtonAppearance(button,labelNode,input){
 const patch=validateButtonAppearance(input);
 const dimensions={width:'width',height:'height',fontSize:'font-size',borderWidth:'border-width',borderRadius:'border-radius'};
 for(const [key,css] of Object.entries(dimensions)){
  if(key in patch)button.style.setProperty(css,patch[key]+'px');else button.style.removeProperty(css);
 }
 if(patch.borderWidth>0)button.style.setProperty('border-style','solid');else button.style.removeProperty('border-style');
 button.style.translate=`${patch.offsetX??0}px ${patch.offsetY??0}px`;
 for(const [key,css] of Object.entries({borderColor:'border-color',backgroundColor:'background-color',textColor:'color'})){
  if(patch[key]){const alpha=key==='textColor'?'':Math.round((patch.colourStrength??10)*25.5).toString(16).padStart(2,'0');button.style.setProperty(css,patch[key]+alpha);}
  else button.style.removeProperty(css);
 }
 labelNode.textContent=patch.label??'';
 return patch;
}
