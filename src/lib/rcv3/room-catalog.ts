import {roomTemplates, templateImage} from './templates';

// Add artwork and variants here; room creation always uses the shared template runtime.
// Empty slots are intentionally not selectable. Never copy customer data into the catalog.
export type RoomModel = {slot:number; name:string; category:string; coverTemplate:string; cover?:string; variants:readonly string[]};
export const publishedRoomModels:readonly RoomModel[] = [
 {slot:1,name:'Office Collection',category:'Office',coverTemplate:'executive',variants:['executive','skyline','night']},
 {slot:2,name:'Private Library',category:'Study',coverTemplate:'library',variants:['library']},
 {slot:3,name:'Garden Studio',category:'Nature',coverTemplate:'garden',variants:['garden']},
 {slot:4,name:'Creative Collection',category:'Creative',coverTemplate:'creative',variants:['creative','cartoon']},
 {slot:5,name:'Minimal Collection',category:'Simple',coverTemplate:'minimal',variants:['minimal','blank']},
];
export const roomCatalog = Array.from({length:150},(_,i)=>({slot:i+1,model:publishedRoomModels.find(m=>m.slot===i+1)}));
export function modelImage(model:RoomModel){
 const template=roomTemplates.find(t=>t.id===model.coverTemplate);
 return model.cover || (template ? templateImage(template) : '');
}
