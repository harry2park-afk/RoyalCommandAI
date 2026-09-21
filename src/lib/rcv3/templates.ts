// RCV3 design assets only. Room actions/features stay in the shared runtime.
export type RoomDesignAsset = {
  id: string;
  name: string;
  kind: "image" | "video";
  category: string;
  keywords: string;
  thumbnail: string;
  image?: string;
  video?: string;
  groups: string[];
};

export const DESIGN_CATEGORY_GROUPS = [
  { key: "accounting-finance", label: "Accounting / Tax / Finance" },
  { key: "agriculture", label: "Agriculture / Horticulture" },
  { key: "architecture-art", label: "Architecture / Design / Art" },
  { key: "automotive", label: "Automotive" },
  { key: "baby", label: "Baby / Nursery" },
  { key: "beauty", label: "Beauty / Salon" },
  { key: "business", label: "Business / Company / Executive" },
  { key: "construction", label: "Construction / Trades / Building Materials" },
  { key: "consultation", label: "Consultation / Coaching" },
  { key: "education", label: "Education / Classroom / Study" },
  { key: "electronics", label: "Electronics / Hardware / Tools" },
  { key: "food", label: "Food / Grocery / Cooking" },
  { key: "games", label: "Game / Chess / Baduk / Board Games" },
  { key: "health", label: "Healthcare / Medical / Clinic" },
  { key: "hotel-travel", label: "Hotel / Travel" },
  { key: "insurance", label: "Insurance" },
  { key: "legal", label: "Legal" },
  { key: "library", label: "Library / Reading" },
  { key: "logistics", label: "Logistics / Transport" },
  { key: "marketing-media", label: "Marketing / Media / Movie / Podcast" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "meeting", label: "Conference / Video Conference / Webinar" },
  { key: "migration", label: "Migration / Visa" },
  { key: "music", label: "Music / Vocal / Recording" },
  { key: "pet", label: "Pet / Animal Care" },
  { key: "photography", label: "Photography / Studio" },
  { key: "property", label: "Real Estate / Property Management" },
  { key: "recruitment", label: "Recruitment / HR / Interview" },
  { key: "retail", label: "Retail / Online Store / Marketplace" },
  { key: "robotics", label: "Robotics / Maker" },
  { key: "space", label: "Space / Satellite / Earth Observation" },
  { key: "stock", label: "Stock / Trading / Investment" },
  { key: "technology", label: "IT / Software / AI / Website" },
  { key: "telecom", label: "Telecommunications" },
  { key: "wellness", label: "Fitness / Gym / Yoga / Meditation / Wellness" },
  { key: "custom", label: "Anything / Custom" },
] as const;

export const roomTemplates: RoomDesignAsset[] = [
  {id:"ocean-office",name:"Ocean Office",kind:"image",category:"Office",keywords:"ocean coast modern office",thumbnail:"/room-designs/ocean-office-v1.webp",image:"/room-designs/ocean-office-v1.webp",groups:["all"]},
  {id:"desert-office",name:"Desert Office",kind:"image",category:"Office",keywords:"desert stone warm office",thumbnail:"/room-designs/desert-office-v1.webp",image:"/room-designs/desert-office-v1.webp",groups:["all"]},
  {id:"grand-library-office",name:"Grand Library Office",kind:"image",category:"Office",keywords:"library classic books office",thumbnail:"/room-designs/grand-library-office-v1.webp",image:"/room-designs/grand-library-office-v1.webp",groups:["all","library","legal","accounting-finance"]},
  {id:"forest-office",name:"Forest Office",kind:"image",category:"Office",keywords:"forest nature wood calm office",thumbnail:"/room-designs/forest-office-v1.webp",image:"/room-designs/forest-office-v1.webp",groups:["all","wellness","agriculture"]},
  {id:"illustrated-office",name:"Illustrated Office",kind:"image",category:"Illustration",keywords:"illustrated bright city creative",thumbnail:"/room-designs/illustrated-office-v1.webp",image:"/room-designs/illustrated-office-v1.webp",groups:["all","architecture-art","games","marketing-media"]},
  {id:"classic-office",name:"Classic Office",kind:"image",category:"Office",keywords:"classic warm wood executive office",thumbnail:"/room-designs/classic-office-v1.webp",image:"/room-designs/classic-office-v1.webp",groups:["all","business","legal","accounting-finance","property"]},
  {id:"harbor-architecture-studio",name:"Harbor Architecture Studio",kind:"image",category:"Office",keywords:"harbor architecture waterfront team boss boat birds",thumbnail:"/room-designs/harbor-architecture-studio-v1.webp",image:"/room-designs/harbor-architecture-studio-v1.webp",groups:["all","architecture-art","business","property"]},
  {id:"airport-strategy-office",name:"Airport Strategy Office",kind:"image",category:"Executive",keywords:"airport strategy global executive team airplane",thumbnail:"/room-designs/airport-strategy-office-v1.webp",image:"/room-designs/airport-strategy-office-v1.webp",groups:["all","business","meeting","technology"]},
  {id:"classic-legal-library",name:"Classic Legal Library",kind:"image",category:"Legal",keywords:"legal library classic law executive city",thumbnail:"/room-designs/classic-legal-library-v1.webp",image:"/room-designs/classic-legal-library-v1.webp",groups:["all","legal","accounting-finance","library"]},
  {id:"forest-eco-studio",name:"Forest Eco Studio",kind:"image",category:"Nature",keywords:"forest eco creative nature team birds",thumbnail:"/room-designs/forest-eco-studio-v1.webp",image:"/room-designs/forest-eco-studio-v1.webp",groups:["all","architecture-art","agriculture","wellness"]},
  {id:"creative-studio-team",name:"Creative Studio Team",kind:"image",category:"Creative",keywords:"creative art design team studio city",thumbnail:"/room-designs/creative-studio-team-v1.webp",image:"/room-designs/creative-studio-team-v1.webp",groups:["all","architecture-art","marketing-media"]},
  {id:"rc-office-01",name:"RC Office 01",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-01.webp",image:"/room-designs/rc-office-01.webp",groups:["all","business","meeting"]},
  {id:"rc-office-02",name:"RC Office 02",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-02.webp",image:"/room-designs/rc-office-02.webp",groups:["all","business","meeting"]},
  {id:"rc-office-03",name:"RC Office 03",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-03.webp",image:"/room-designs/rc-office-03.webp",groups:["all","business","meeting"]},
  {id:"rc-office-04",name:"RC Office 04",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-04.webp",image:"/room-designs/rc-office-04.webp",groups:["all","business","meeting"]},
  {id:"rc-office-05",name:"RC Office 05",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-05.webp",image:"/room-designs/rc-office-05.webp",groups:["all","business","meeting"]},
  {id:"rc-office-06",name:"RC Office 06",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-06.webp",image:"/room-designs/rc-office-06.webp",groups:["all","business","meeting"]},
  {id:"rc-office-07",name:"RC Office 07",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-07.webp",image:"/room-designs/rc-office-07.webp",groups:["all","business","meeting"]},
  {id:"rc-office-08",name:"RC Office 08",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-08.webp",image:"/room-designs/rc-office-08.webp",groups:["all","business","meeting"]},
  {id:"rc-office-09",name:"RC Office 09",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-09.webp",image:"/room-designs/rc-office-09.webp",groups:["all","business","meeting"]},
  {id:"rc-office-10",name:"RC Office 10",kind:"image",category:"RC Office",keywords:"RC Office Sydney harbour brown desk laptop ferry fishing boats clouds seagulls",thumbnail:"/room-designs/rc-office-10.webp",image:"/room-designs/rc-office-10.webp",groups:["all","business","meeting"]},
];

export type RoomTemplate = RoomDesignAsset;
export function templateImage(t: RoomDesignAsset) { return t.image || t.thumbnail; }
