// Background artwork only; all actions remain in the shared button runtime.
export const roomTemplates = [
 {id:'ocean-office',name:'Ocean Office',category:'Office',keywords:'ocean coast modern',image:'/room-designs/ocean-office-v1.webp'},
 {id:'desert-office',name:'Desert Office',category:'Office',keywords:'desert stone warm',image:'/room-designs/desert-office-v1.webp'},
 {id:'grand-library-office',name:'Grand Library Office',category:'Office',keywords:'library classic books',image:'/room-designs/grand-library-office-v1.webp'},
 {id:'forest-office',name:'Forest Office',category:'Office',keywords:'forest nature wood',image:'/room-designs/forest-office-v1.webp'},
 {id:'illustrated-office',name:'Illustrated Office',category:'Illustration',keywords:'illustrated bright city',image:'/room-designs/illustrated-office-v1.webp'},
 {id:'classic-office',name:'Classic Office',category:'Office',keywords:'classic warm wood',image:'/room-designs/classic-office-v1.webp'},
] as const;
export type RoomTemplate = typeof roomTemplates[number];
export function templateImage(t:RoomTemplate){return t.image;}
