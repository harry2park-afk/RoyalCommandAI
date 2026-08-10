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
  { id: "medical", name: "Hospital / Clinic", shortDescription: "Medical practice, clinic, specialist or allied-health Room", suggestedAgents: ["Reception", "Booking", "Patient Support", "Documents"], fields: [
    { id: "specialty", label: "Clinic / specialty", options: ["GP", "Dental", "Psychology", "Physiotherapy", "Specialist", "Allied Health", "Other"] },
    { id: "consultRooms", label: "Consultation rooms", options: ["1", "2", "3", "4", "5+"] },
    { id: "privacy", label: "Privacy level", options: ["Standard", "High", "Very high"] },
  ]},
  { id: "legal", name: "Legal Office", shortDescription: "Law practice, client consultation and case-work Room", suggestedAgents: ["Reception", "Legal Intake", "Documents", "Research", "Scheduling"], fields: [
    { id: "practice", label: "Practice area", options: ["Family", "Property", "Compensation", "Commercial", "Criminal", "Immigration", "General"] },
    { id: "team", label: "Professionals", options: ["1", "2-3", "4-10", "10+"] },
    { id: "contact", label: "Client contact", options: ["Chat", "Phone", "Video", "Email", "Mixed"] },
  ]},
  { id: "accounting", name: "Accounting / Tax Office", shortDescription: "Accounting, bookkeeping, tax and financial administration Room", suggestedAgents: ["Reception", "Accounting Intake", "Document Assistant", "Reminders"], fields: [
    { id: "services", label: "Main services", options: ["Tax Returns", "Bookkeeping", "GST / BAS", "Payroll", "Company Accounts", "Mixed"] },
    { id: "staff", label: "Staff", options: ["1", "2-3", "4-10", "10+"] },
  ]},
  { id: "finance", name: "Finance / Money Services", shortDescription: "Loans, broking, payments, remittance and FX", suggestedAgents: ["Finance Reception", "Loan Intake", "Document Checker", "Broker Assistant", "AML/KYC Assistant"], fields: [
    { id: "service", label: "Finance service", options: ["Home Loans", "Business Finance", "Refinance", "Payments", "FX", "Remittance", "Mixed"] },
    { id: "customer", label: "Customer type", options: ["Individuals", "Small Business", "Companies", "Property Investors", "Mixed"] },
    { id: "verification", label: "Verification", options: ["Basic ID", "KYC", "Enhanced KYC / AML", "Business Verification"] },
  ]},
  { id: "business", name: "Business / Company Office", shortDescription: "General company, private business or professional office Room", suggestedAgents: ["Reception", "Executive Assistant", "Sales", "Documents", "Operations"], fields: [
    { id: "team", label: "Team size", options: ["1", "2-5", "6-20", "20+"] },
    { id: "departments", label: "Main departments", options: ["Reception", "Sales", "Accounts", "Support", "Operations", "Mixed"] },
  ]},
  { id: "realestate", name: "Real Estate", shortDescription: "Sales, leasing, buyers, vendors and property enquiries", suggestedAgents: ["Reception", "Property Enquiry", "Inspection Booking", "Follow-up"], fields: [
    { id: "service", label: "Main service", options: ["Residential Sales", "Commercial Sales", "Leasing", "Buyers Agent", "Mixed"] },
    { id: "clients", label: "Main clients", options: ["Buyers", "Sellers", "Landlords", "Tenants", "Mixed"] },
  ]},
  { id: "propertymanagement", name: "Property Management", shortDescription: "Rent, maintenance, inspections and tenant management", suggestedAgents: ["Tenant Support", "Maintenance", "Inspection", "Documents"], fields: [
    { id: "portfolio", label: "Portfolio size", options: ["1-20", "21-100", "101-500", "500+"] },
    { id: "priority", label: "Main workflow", options: ["Rent", "Maintenance", "Inspections", "Arrears", "All"] },
  ]},
  { id: "construction", name: "Construction / Trades", shortDescription: "Builders, contractors, electricians, plumbers and trades", suggestedAgents: ["Reception", "Quote Assistant", "Scheduling", "Project Coordinator"], fields: [
    { id: "trade", label: "Trade / service", options: ["Builder", "Electrician", "Plumber", "Carpenter", "Painter", "Multi-trade"] },
    { id: "jobs", label: "Job type", options: ["Residential", "Commercial", "Maintenance", "Projects", "Mixed"] },
  ]},
  { id: "architecture", name: "Architecture / Design Studio", shortDescription: "Architecture, engineering, interior and 3D design Room", suggestedAgents: ["Design Assistant", "Project Coordinator", "Documents", "Client Presentation"], fields: [
    { id: "design", label: "Main design work", options: ["Residential", "Commercial", "Interior", "Engineering", "3D / Visualisation", "Mixed"] },
    { id: "team", label: "Team size", options: ["1", "2-5", "6-20", "20+"] },
  ]},
  { id: "restaurant", name: "Restaurant / Cafe", shortDescription: "Bookings, takeaway, menus, customer enquiries and operations", suggestedAgents: ["Reception", "Booking", "Order Support", "Menu Assistant"], fields: [
    { id: "venue", label: "Venue type", options: ["Restaurant", "Cafe", "Takeaway", "Bakery", "Food Court", "Mixed"] },
    { id: "service", label: "Main service", options: ["Bookings", "Dine-in", "Takeaway", "Delivery", "Functions", "Mixed"] },
  ]},
  { id: "retail", name: "Retail / Online Store", shortDescription: "Product enquiries, orders, returns and online sales", suggestedAgents: ["Sales", "Customer Support", "Orders", "Returns"], fields: [
    { id: "channel", label: "Sales channel", options: ["Physical Store", "Online", "Marketplace", "Wholesale", "Mixed"] },
    { id: "support", label: "Main customer need", options: ["Products", "Orders", "Returns", "Delivery", "All"] },
  ]},
  { id: "hotel", name: "Hotel / Travel", shortDescription: "Accommodation, reservations, tours and guest services", suggestedAgents: ["Reservations", "Guest Services", "Travel Planner", "Support"], fields: [
    { id: "type", label: "Business type", options: ["Hotel", "Motel", "Serviced Apartment", "Travel Agency", "Tour Operator"] },
    { id: "service", label: "Main service", options: ["Reservations", "Guest Support", "Tours", "Transport", "Mixed"] },
  ]},
  { id: "automotive", name: "Automotive", shortDescription: "Dealers, workshops, repairs, servicing and bookings", suggestedAgents: ["Reception", "Service Booking", "Quote Assistant", "Customer Follow-up"], fields: [
    { id: "businessType", label: "Business type", options: ["Dealer", "Workshop", "Mechanic", "Tyres", "Panel / Body", "Detailing"] },
    { id: "workflow", label: "Main workflow", options: ["Bookings", "Quotes", "Repairs", "Sales", "Mixed"] },
  ]},
  { id: "insurance", name: "Insurance", shortDescription: "Insurance enquiries, claims intake and policy support", suggestedAgents: ["Reception", "Claims Intake", "Policy Support", "Documents"], fields: [
    { id: "insuranceType", label: "Insurance type", options: ["Home", "Motor", "Business", "Travel", "Life", "Mixed"] },
    { id: "workflow", label: "Main workflow", options: ["Quotes", "Policies", "Claims", "Renewals", "Mixed"] },
  ]},
  { id: "migration", name: "Migration / Visa Services", shortDescription: "Visa enquiries, client intake, documents and appointments", suggestedAgents: ["Reception", "Visa Intake", "Document Assistant", "Booking"], fields: [
    { id: "visa", label: "Main visa service", options: ["Student", "Partner", "Skilled", "Business", "Visitor", "Mixed"] },
    { id: "stage", label: "Client stage", options: ["Initial Enquiry", "Document Collection", "Application", "Follow-up", "Mixed"] },
  ]},
  { id: "recruitment", name: "Recruitment / HR", shortDescription: "Candidates, vacancies, interviews and HR support", suggestedAgents: ["Candidate Intake", "Job Matching", "Interview Booking", "HR Assistant"], fields: [
    { id: "service", label: "Main service", options: ["Recruitment", "Labour Hire", "Internal HR", "Executive Search", "Mixed"] },
    { id: "audience", label: "Main audience", options: ["Candidates", "Employers", "Staff", "Mixed"] },
  ]},
  { id: "technology", name: "IT / Software / AI", shortDescription: "Software companies, IT support, SaaS and AI services", suggestedAgents: ["Technical Support", "Sales", "Onboarding", "Documentation"], fields: [
    { id: "service", label: "Main service", options: ["Software", "SaaS", "IT Support", "Cybersecurity", "AI Services", "Mixed"] },
    { id: "customer", label: "Customer type", options: ["Consumers", "Small Business", "Enterprise", "Developers", "Mixed"] },
  ]},
  { id: "marketing", name: "Marketing / Media", shortDescription: "Marketing, advertising, social media, content and campaigns", suggestedAgents: ["Client Intake", "Content", "Campaign Assistant", "Reporting"], fields: [
    { id: "service", label: "Main service", options: ["Digital Marketing", "Social Media", "Advertising", "Content", "PR", "Mixed"] },
    { id: "clients", label: "Client type", options: ["Local Business", "E-commerce", "Corporate", "Creators", "Mixed"] },
  ]},
  { id: "manufacturing", name: "Manufacturing", shortDescription: "Production, suppliers, orders, quality and operations", suggestedAgents: ["Operations", "Procurement", "Orders", "Quality Assistant"], fields: [
    { id: "production", label: "Production type", options: ["Food", "Industrial", "Consumer Goods", "Components", "Custom", "Mixed"] },
    { id: "workflow", label: "Main workflow", options: ["Orders", "Production", "Suppliers", "Quality", "All"] },
  ]},
  { id: "agriculture", name: "Agriculture / Horticulture", shortDescription: "Farming, greenhouse, crops, nursery and horticulture", suggestedAgents: ["Operations", "Crop Assistant", "Records", "Sales"], fields: [
    { id: "type", label: "Operation type", options: ["Farm", "Greenhouse", "Nursery", "Research", "Wholesale", "Mixed"] },
    { id: "crop", label: "Main crop / product", placeholder: "e.g. fruit, vegetables, plants, flowers" },
  ]},
  { id: "logistics", name: "Logistics / Transport", shortDescription: "Freight, deliveries, dispatch, fleet and transport services", suggestedAgents: ["Dispatch", "Booking", "Tracking", "Customer Support"], fields: [
    { id: "service", label: "Transport service", options: ["Courier", "Freight", "Trucking", "Warehousing", "Passenger", "Mixed"] },
    { id: "workflow", label: "Main workflow", options: ["Bookings", "Dispatch", "Tracking", "Delivery Support", "All"] },
  ]},
  { id: "beauty", name: "Beauty / Salon", shortDescription: "Appointments, services, customer care and reminders", suggestedAgents: ["Reception", "Booking", "Customer Care", "Reminders"], fields: [
    { id: "service", label: "Business type", options: ["Hair", "Beauty", "Nails", "Spa", "Cosmetic", "Mixed"] },
    { id: "booking", label: "Booking style", options: ["Appointments", "Walk-in", "Both"] },
  ]},
  { id: "fitness", name: "Fitness / Gym", shortDescription: "Membership, classes, bookings and coaching", suggestedAgents: ["Reception", "Membership", "Class Booking", "Coach Assistant"], fields: [
    { id: "type", label: "Business type", options: ["Gym", "Personal Training", "Yoga", "Pilates", "Sports Club", "Mixed"] },
    { id: "service", label: "Main service", options: ["Membership", "Classes", "Coaching", "Bookings", "Mixed"] },
  ]},
  { id: "education", name: "Education / Classroom", shortDescription: "School, tutoring, academy, lessons or training", suggestedAgents: ["AI Tutor", "Lesson Planner", "Assessment", "Student Support"], fields: [
    { id: "subject", label: "Subject / training", options: ["Math", "English", "Languages", "Technology", "Professional Training", "Mixed"] },
    { id: "students", label: "Student group", options: ["One-to-one", "Small Group", "Class", "Large Group"] },
  ]},
  { id: "music", name: "Music / Vocal Studio", shortDescription: "Music, singing, instrument and performance education", suggestedAgents: ["Music Tutor", "Practice Coach", "Lesson Planner", "Recording Notes"], fields: [
    { id: "training", label: "Training", options: ["Vocal", "Piano", "Guitar", "Strings", "Wind", "Mixed"] },
    { id: "level", label: "Student level", options: ["Beginner", "Intermediate", "Advanced", "Mixed"] },
  ]},
  { id: "dance", name: "Dance / Movement Studio", shortDescription: "Dance, movement and performance training", suggestedAgents: ["Dance Coach", "Lesson Planner", "Practice Assistant"], fields: [
    { id: "style", label: "Dance style", options: ["Ballet", "K-pop", "Ballroom", "Contemporary", "Hip-hop", "Mixed"] },
    { id: "classSize", label: "Class size", options: ["One-to-one", "2-10", "11-30", "30+"] },
  ]},
  { id: "consultation", name: "Professional Consultation", shortDescription: "Psychology, coaching, advisory or specialist consultation", suggestedAgents: ["Reception", "Consultation Assistant", "Booking", "Notes"], fields: [
    { id: "profession", label: "Professional service", options: ["Psychology", "Coaching", "Advisory", "Insurance", "Consulting", "Other"] },
    { id: "mode", label: "Consultation mode", options: ["Video", "Voice", "Chat", "In-person", "Mixed"] },
  ]},
  { id: "custom", name: "Other / Custom", shortDescription: "Any other Room not covered above", suggestedAgents: ["AI Room Designer", "Reception", "General Assistant"], fields: [
    { id: "purpose", label: "What should this Room do?", placeholder: "Tell us in a few words" },
    { id: "users", label: "Who will use it?", options: ["Customers", "Staff", "Students", "Members", "Family", "Mixed"] },
  ]},
];

export const COMMON_ROOM_FIELDS: RoomTemplateField[] = [
  { id: "roomName", label: "Room name", placeholder: "e.g. Park Family Clinic" },
  { id: "peopleCount", label: "How many people normally use the Room?", options: ["1", "2-5", "6-20", "20+"] },
  { id: "atmosphere", label: "Preferred atmosphere", options: ["Professional", "Warm", "Luxury", "Simple", "Modern", "Calm"] },
  { id: "specialRequest", label: "Anything else you want?", placeholder: "Optional" },
];
