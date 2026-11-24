import {rcOfficeDesigns} from './rc-office-designs';
// Design seats describe artwork, not connected meeting capacity.
export const meetingBackgrounds = [
 {id:'meeting-solo-ivory',name:'Solo · Ivory',image:'/room-designs/meeting-solo-ivory-v2.webp',deskTop:0.674,seats:[0.5],staff:false},
 {id:'meeting-solo-garden',name:'Solo · Garden',image:'/room-designs/meeting-solo-garden-v2.webp',deskTop:0.642,seats:[0.5],staff:false},
 {id:'meeting-duo-blue',name:'2 Seats · Blue',image:'/room-designs/meeting-duo-blue-v2.webp',deskTop:0.73,seats:[0.36, 0.64],staff:false},
 {id:'meeting-duo-library',name:'2 Seats · Library',image:'/room-designs/meeting-duo-library-v2.webp',deskTop:0.73,seats:[0.36, 0.64],staff:false},
 {id:'meeting-trio-zen',name:'3 Seats · Zen',image:'/room-designs/meeting-trio-zen-v2.webp',deskTop:0.73,seats:[0.19, 0.5, 0.81],staff:false},
 {id:'meeting-trio-glass',name:'3 Seats · Glass',image:'/room-designs/meeting-trio-glass-v2.webp',deskTop:0.73,seats:[0.19, 0.5, 0.81],staff:false},
 {id:'meeting-group-emerald',name:'Group · Wide Table',image:'/room-designs/meeting-group-emerald-v2.webp',deskTop:0.718,seats:[0.1, 0.26, 0.42, 0.58, 0.74, 0.9],staff:false},
 {id:'meeting-ocean-01',name:'4 Seats · Executive',image:'/room-designs/meeting-ocean-01.webp',deskTop:0.73,seats:[0.41],staff:true},
 {id:'meeting-ocean-05',name:'4 Seats · Library',image:'/room-designs/meeting-ocean-05.webp',deskTop:0.73,seats:[0.41],staff:true},
 {id:'meeting-ocean-09',name:'4 Seats · Emerald',image:'/room-designs/meeting-ocean-09.webp',deskTop:0.73,seats:[0.41],staff:true},
 ...rcOfficeDesigns.map(design=>({...design,deskTop:0.73,seats:[0.5] as const,staff:false as const})),
] as const;
