export type RoomTemplateField = {
  id: string;
  label: string;
  placeholder?: string;
  options?: string[];
};

export type RoomTemplate = {
  id: string;
  name: string;
  shortDescription: string;
  suggestedAgents: string[];
  fields: RoomTemplateField[];
};

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: "medical",
    name: "Hospital / Clinic",
    shortDescription: "Medical practice, clinic, specialist or allied-health Room",
    suggestedAgents: ["Reception", "Booking", "Patient Support", "Documents"],
    fields: [
      { id: "specialty", label: "What type of clinic or specialty?", placeholder: "e.g. GP, dental, psychology, physiotherapy" },
      { id: "consultRooms", label: "How many consultation rooms?", options: ["1", "2", "3", "4", "5+"] },
      { id: "waiting", label: "Waiting / reception area?", options: ["Small", "Standard", "Large"] },
      { id: "privacy", label: "Privacy level", options: ["Standard", "High", "Very high"] },
      { id: "services", label: "Main services or workflow", placeholder: "Describe briefly" },
    ],
  },
  {
    id: "legal",
    name: "Legal Office",
    shortDescription: "Law practice, client consultation and case-work Room",
    suggestedAgents: ["Reception", "Legal Intake", "Documents", "Research", "Scheduling"],
    fields: [
      { id: "practice", label: "Main legal practice area", placeholder: "e.g. family, property, compensation, commercial" },
      { id: "lawyers", label: "How many professionals use the Room?", options: ["1", "2-3", "4-10", "10+"] },
      { id: "clientRooms", label: "Client meeting rooms", options: ["1", "2", "3+", "Video-first"] },
      { id: "casework", label: "Main case workflow", placeholder: "Describe briefly" },
    ],
  },
  {
    id: "accounting",
    name: "Accounting / Tax Office",
    shortDescription: "Accounting, bookkeeping, tax and financial administration Room",
    suggestedAgents: ["Reception", "Accounting Intake", "Document Assistant", "Reminders"],
    fields: [
      { id: "services", label: "Main services", placeholder: "e.g. tax returns, bookkeeping, GST/BAS, payroll" },
      { id: "staff", label: "Number of staff", options: ["1", "2-3", "4-10", "10+"] },
      { id: "clientMeetings", label: "Client consultation style", options: ["Mostly chat", "Mostly voice", "Mostly video", "Mixed"] },
      { id: "documents", label: "Main documents handled", placeholder: "Describe briefly" },
    ],
  },
  {
    id: "business",
    name: "Business / Company Office",
    shortDescription: "General company, private business or professional office Room",
    suggestedAgents: ["Reception", "Executive Assistant", "Sales", "Documents", "Operations"],
    fields: [
      { id: "industry", label: "What business or industry?", placeholder: "Describe your company" },
      { id: "team", label: "Team size", options: ["1", "2-5", "6-20", "20+"] },
      { id: "departments", label: "Main departments needed", placeholder: "e.g. reception, sales, accounts, support" },
      { id: "customers", label: "How do customers contact you?", options: ["Chat", "Phone", "Video", "Email", "Mixed"] },
    ],
  },
  {
    id: "architecture",
    name: "Architecture / Design Studio",
    shortDescription: "Architecture, engineering, interior and 3D design Room",
    suggestedAgents: ["Design Assistant", "Project Coordinator", "Documents", "Client Presentation"],
    fields: [
      { id: "designType", label: "Main design work", placeholder: "e.g. homes, offices, hospitals, interiors" },
      { id: "team", label: "Design team size", options: ["1", "2-5", "6-20", "20+"] },
      { id: "outputs", label: "Outputs needed", placeholder: "e.g. plans, concepts, 3D presentation, client review" },
      { id: "clientArea", label: "Client presentation area?", options: ["Small", "Standard", "Large", "AI recommend"] },
    ],
  },
  {
    id: "education",
    name: "Education / Classroom",
    shortDescription: "School, tutoring, academy, private lesson or training Room",
    suggestedAgents: ["AI Tutor", "Lesson Planner", "Assessment", "Student Support"],
    fields: [
      { id: "subject", label: "What subject or training?", placeholder: "e.g. mathematics, English, AI training" },
      { id: "students", label: "Student group", options: ["One-to-one", "Small group", "Class", "Large lecture"] },
      { id: "age", label: "Learner age / level", placeholder: "e.g. primary, high school, adult, professional" },
      { id: "style", label: "Teaching style", options: ["AI tutor", "Human teacher", "Human + AI", "AI recommend"] },
    ],
  },
  {
    id: "music",
    name: "Music / Vocal Studio",
    shortDescription: "Music, singing, instrument and performance education Room",
    suggestedAgents: ["Music Tutor", "Practice Coach", "Lesson Planner", "Recording Notes"],
    fields: [
      { id: "training", label: "What will be taught?", placeholder: "e.g. vocal, guitar, piano, saxophone" },
      { id: "lessonType", label: "Lesson type", options: ["One-to-one", "Group", "Course", "Mixed"] },
      { id: "level", label: "Student level", options: ["Beginner", "Intermediate", "Advanced", "Mixed"] },
      { id: "equipment", label: "Equipment / instruments needed", placeholder: "Describe briefly" },
    ],
  },
  {
    id: "dance",
    name: "Dance / Movement Studio",
    shortDescription: "Dance, movement and performance training Room",
    suggestedAgents: ["Dance Coach", "Lesson Planner", "Practice Assistant"],
    fields: [
      { id: "style", label: "Dance style", placeholder: "e.g. ballet, K-pop, ballroom, contemporary" },
      { id: "classSize", label: "Class size", options: ["One-to-one", "2-10", "11-30", "30+"] },
      { id: "level", label: "Student level", options: ["Beginner", "Intermediate", "Advanced", "Mixed"] },
      { id: "space", label: "Studio requirements", placeholder: "e.g. mirrors, open floor, instructor area" },
    ],
  },
  {
    id: "consultation",
    name: "Professional Consultation",
    shortDescription: "Psychology, coaching, advisory or specialist consultation Room",
    suggestedAgents: ["Reception", "Consultation Assistant", "Booking", "Notes"],
    fields: [
      { id: "profession", label: "What professional service?", placeholder: "e.g. psychology, coaching, migration, insurance" },
      { id: "presence", label: "Preferred consultation mode", options: ["Live video", "Avatar", "Voice only", "Chat", "Mixed"] },
      { id: "audience", label: "Main audience", options: ["General", "Children", "Seniors", "Professionals", "Mixed"] },
      { id: "privacy", label: "Privacy / comfort needs", placeholder: "Describe briefly" },
    ],
  },
  {
    id: "custom",
    name: "Other / Custom",
    shortDescription: "Any other Room not covered above",
    suggestedAgents: ["AI Room Designer", "Reception", "General Assistant"],
    fields: [
      { id: "purpose", label: "What do you want this Room to do?", placeholder: "Just tell us in your own words" },
      { id: "people", label: "Who will use it?", placeholder: "e.g. customers, staff, students, family" },
      { id: "features", label: "Important things the Room must have", placeholder: "Describe briefly" },
    ],
  },
];

export const COMMON_ROOM_FIELDS: RoomTemplateField[] = [
  { id: "roomName", label: "Room name", placeholder: "e.g. Park Family Clinic" },
  { id: "peopleCount", label: "How many people normally use the Room?", placeholder: "e.g. 1-5" },
  { id: "atmosphere", label: "Preferred atmosphere", options: ["Professional", "Warm", "Luxury", "Simple", "Modern", "Calm"] },
  { id: "specialRequest", label: "Anything else you want?", placeholder: "Optional — tell us in your own words" },
];
