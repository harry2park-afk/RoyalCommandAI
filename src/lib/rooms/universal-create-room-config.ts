export type BillingType = "monthly" | "one_time" | "quote" | "included";

export type CatalogItem = {
  id: string;
  category: "ai" | "secretary" | "communication" | "business" | "professional" | "accounting" | "legal" | "files" | "education" | "mail" | "website" | "maintenance";
  name: string;
  description: string;
  billing: BillingType;
  priceAud?: number;
  priceLabel?: string;
  consultation?: boolean;
  includedIn?: string[];
  exclusiveGroup?: string;
};

export type IndustryProfile = {
  id: string;
  label: string;
  keywords: string[];
  recommended: string[];
};

export const CREATE_ROOM_FORM_VERSION = "0.4";
export const BASIC_ROOM_MONTHLY_AUD = 3.8;
export const BASIC_TRIAL_DAYS = 30;
export const PROMOTION_PERCENT = 30;
export const WEBSITE_BENEFIT_THRESHOLD_AUD = 80;

export const INDUSTRIES: IndustryProfile[] = [
  { id: "accountant", label: "Accountant", keywords: ["accountant", "accounting", "회계", "세무", "gst", "bas"], recommended: ["ai-chatgpt", "secretary-basic", "cloud-phone-notify", "accounting-connect", "accounting-xero", "files-advanced", "calendar"] },
  { id: "legal", label: "Legal", keywords: ["legal", "law", "lawyer", "변호사", "법률"], recommended: ["ai-claude", "secretary-basic", "cloud-phone-ai", "legal-connect", "legal-leap-lawconnect", "files-advanced", "esign", "calendar"] },
  { id: "real-estate", label: "Real Estate", keywords: ["real estate", "property", "부동산"], recommended: ["ai-chatgpt", "secretary-basic", "cloud-phone-business", "booking", "sms", "calendar"] },
  { id: "medical", label: "Medical / Health", keywords: ["medical", "clinic", "doctor", "health", "의료", "병원"], recommended: ["ai-gemini", "secretary-basic", "booking", "sms", "files-advanced", "calendar"] },
  { id: "insurance", label: "Insurance", keywords: ["insurance", "보험"], recommended: ["ai-chatgpt", "secretary-basic", "cloud-phone-notify", "files-advanced", "esign"] },
  { id: "trading", label: "Trading / Import-Export", keywords: ["trading", "import", "export", "무역", "수입", "수출"], recommended: ["ai-chatgpt", "email", "files-advanced", "invoice", "calendar"] },
  { id: "writer", label: "Writer / Creator", keywords: ["writer", "author", "book", "작가", "책", "집필"], recommended: ["ai-chatgpt", "files-advanced", "translation"] },
  { id: "general", label: "General / Personal", keywords: [], recommended: ["ai-chatgpt", "files-basic", "integration-learning", "calendar"] },
];

export const CATALOG: CatalogItem[] = [
  { id: "ai-own", category: "ai", name: "Use my own AI account", description: "Connect your own supported AI account/API. Royal Command does not charge an RC AI usage fee for the linked AI account itself.", billing: "included", priceLabel: "No RC AI fee" },
  { id: "ai-chatgpt", category: "ai", name: "ChatGPT", description: "RC-provided ChatGPT access for this Room.", billing: "monthly", priceAud: 28 },
  { id: "ai-claude", category: "ai", name: "Claude", description: "RC-provided Claude access for this Room.", billing: "monthly", priceAud: 28 },
  { id: "ai-gemini", category: "ai", name: "Gemini", description: "RC-provided Gemini access for this Room.", billing: "monthly", priceAud: 28 },
  { id: "ai-grok", category: "ai", name: "Grok", description: "RC-provided Grok access for this Room.", billing: "monthly", priceAud: 28 },
  { id: "advanced-ai", category: "ai", name: "Additional / Specialist AI", description: "Add specialist or additional AI models to the Room when required.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "secretary-basic", category: "secretary", name: "Basic AI Secretary", description: "Entry-level assistant for messages, simple follow-up and Room assistance.", billing: "monthly", priceAud: 80, exclusiveGroup: "secretary-tier" },
  { id: "secretary-2", category: "secretary", name: "AI Secretary Level 2", description: "Expanded office assistance and routine administration.", billing: "monthly", priceAud: 120, exclusiveGroup: "secretary-tier" },
  { id: "secretary-3", category: "secretary", name: "AI Secretary Level 3", description: "Office support with broader automation and follow-up.", billing: "monthly", priceAud: 160, exclusiveGroup: "secretary-tier" },
  { id: "secretary-4", category: "secretary", name: "AI Secretary Level 4", description: "Professional assistant tier for business workflows.", billing: "monthly", priceAud: 220, exclusiveGroup: "secretary-tier" },
  { id: "secretary-5", category: "secretary", name: "AI Secretary Level 5", description: "Executive assistant tier with more advanced coordination.", billing: "monthly", priceAud: 290, exclusiveGroup: "secretary-tier" },
  { id: "secretary-6", category: "secretary", name: "AI Secretary Level 6", description: "Advanced executive assistance for larger workloads.", billing: "monthly", priceAud: 360, exclusiveGroup: "secretary-tier" },
  { id: "secretary-7", category: "secretary", name: "AI Secretary Level 7", description: "Senior executive assistance and expanded workflow support.", billing: "monthly", priceAud: 430, exclusiveGroup: "secretary-tier" },
  { id: "secretary-8", category: "secretary", name: "AI Secretary Level 8", description: "Director-level office automation and coordination.", billing: "monthly", priceAud: 500, exclusiveGroup: "secretary-tier" },
  { id: "secretary-9", category: "secretary", name: "AI Secretary Level 9", description: "Premier business assistance for complex operations.", billing: "monthly", priceAud: 575, exclusiveGroup: "secretary-tier" },
  { id: "secretary-10", category: "secretary", name: "Royal Executive", description: "Top tier with two AI secretaries and advanced office support.", billing: "monthly", priceAud: 650, exclusiveGroup: "secretary-tier" },

  { id: "cloud-phone-basic", category: "communication", name: "Cloud Phone — Basic", description: "A dedicated Royal Command phone number for receiving and making calls and sending/receiving SMS. Suitable for a personal or simple business contact number.", billing: "monthly", priceLabel: "Price to confirm", exclusiveGroup: "cloud-phone-tier" },
  { id: "cloud-phone-notify", category: "communication", name: "Cloud Phone — Notify", description: "Everything in Basic, plus Royal Command can notify the customer about calls and messages and forward the important details to the chosen contact or Room.", billing: "monthly", priceLabel: "Price to confirm", exclusiveGroup: "cloud-phone-tier" },
  { id: "cloud-phone-ai", category: "communication", name: "Cloud Phone — AI Secretary", description: "AI can answer calls, take messages, ask approved questions, summarize the conversation and deliver the result to the customer. Designed as a practical phone secretary.", billing: "monthly", priceLabel: "Price to confirm", exclusiveGroup: "cloud-phone-tier" },
  { id: "cloud-phone-business", category: "communication", name: "Cloud Phone — Business / Professional", description: "For lawyers, professionals, staff and company numbers. Supports business routing, approved call records, transcription and team workflows where available and lawful.", billing: "monthly", priceLabel: "Price to confirm", exclusiveGroup: "cloud-phone-tier" },
  { id: "personal-phone-custom", category: "communication", name: "Connect Existing Personal Phone", description: "Optional custom service for customers who insist on using an existing phone number. Carrier/device restrictions may limit features, setup can take longer, and additional setup charges may apply. Cloud Phone is recommended instead.", billing: "quote", priceLabel: "Custom quote", consultation: true },
  { id: "booking", category: "communication", name: "Appointment Booking", description: "Book, confirm, reschedule and update appointments from the Room.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "sms", category: "communication", name: "SMS Send / Receive", description: "Two-way SMS, reminders and notification workflows.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "email", category: "communication", name: "Email Assistance", description: "Email support, drafting, intake and customer follow-up from the Room.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "translation", category: "communication", name: "Translation / Interpretation", description: "Translate supported chat, documents and voice workflows between languages.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "legal-connect", category: "professional", name: "Legal Connection", description: "Add legal case records, evidence handling, lawyer preparation and lawyer collaboration tools to this Room. A personal Room can add this later when legal help is needed.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "accounting-connect", category: "professional", name: "Accounting Connection", description: "Add accounting workflows for receipts, bank records, tax documents, GST/BAS preparation and accountant collaboration.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "expert-connect", category: "professional", name: "Human Expert Connection", description: "Connect an approved human professional or specialist to collaborate in the Room when required.", billing: "quote", priceLabel: "Quote when needed", consultation: true },
  { id: "lawyer-collaboration", category: "professional", name: "Lawyer Collaboration Access", description: "Allow an authorised lawyer to review shared case records, request documents and communicate with the customer through controlled access.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "accountant-collaboration", category: "professional", name: "Accountant Collaboration Access", description: "Allow an authorised accountant to review selected accounting files, request documents and work with the customer in the Room.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "accounting-xero", category: "accounting", name: "Xero Connection", description: "Connect or prepare a connection to Xero for supported accounting workflows such as invoices, bank/accounting records, GST/BAS work and accountant collaboration. Availability depends on API permissions and the customer's Xero plan.", billing: "quote", priceLabel: "Connection/setup price to confirm" },
  { id: "accounting-myob", category: "accounting", name: "MYOB Connection", description: "Connect or prepare a connection to MYOB for supported bookkeeping and accounting workflows. Useful for Australian businesses already using MYOB. Availability depends on MYOB API access and the customer's subscription.", billing: "quote", priceLabel: "Connection/setup price to confirm" },
  { id: "accounting-quickbooks", category: "accounting", name: "QuickBooks Connection", description: "Connect or prepare a connection to QuickBooks Online for supported invoicing, bookkeeping, reports and accountant workflows. Availability depends on Intuit permissions and the customer's plan.", billing: "quote", priceLabel: "Connection/setup price to confirm" },
  { id: "accounting-reckon", category: "accounting", name: "Reckon Connection", description: "Connect or prepare a connection to Reckon for supported Australian accounting and bookkeeping workflows. Availability depends on the Reckon product and available integration method.", billing: "quote", priceLabel: "Connection/setup price to confirm" },
  { id: "accounting-other", category: "accounting", name: "Other Accounting Software", description: "Request connection to another accounting, bookkeeping, payroll or tax system. Royal Command first checks whether an official API or safe supported integration is available.", billing: "quote", priceLabel: "Compatibility check / quote" },

  { id: "legal-leap-lawconnect", category: "legal", name: "LEAP / LawConnect Connection", description: "For firms using LEAP and LawConnect. Intended for supported matter, document-sharing and client-collaboration workflows. Connection scope depends on official integration access and permissions.", billing: "quote", priceLabel: "Connection/setup price to confirm" },
  { id: "legal-smokeball", category: "legal", name: "Smokeball Connection", description: "For law firms using Smokeball practice management. Intended for supported matter, document, client and workflow integration where official access permits.", billing: "quote", priceLabel: "Connection/setup price to confirm" },
  { id: "legal-clio", category: "legal", name: "Clio Connection", description: "For firms using Clio Manage or related Clio tools. Intended for supported matter, document, billing and client workflow integration where official API access permits.", billing: "quote", priceLabel: "Connection/setup price to confirm" },
  { id: "legal-actionstep", category: "legal", name: "Actionstep Connection", description: "For firms using Actionstep. Intended for supported legal practice-management and workflow integration where official API access and permissions permit.", billing: "quote", priceLabel: "Connection/setup price to confirm" },
  { id: "legal-other", category: "legal", name: "Other Legal Practice Software", description: "Request connection to another legal practice, conveyancing or case-management system. Royal Command checks official API/support availability before promising a connection.", billing: "quote", priceLabel: "Compatibility check / quote" },

  { id: "files-basic", category: "files", name: "Room File Organizer", description: "Store files directly into a selected Room, project and folder. Useful for personal files, accounting, education, legal work, writing and general projects.", billing: "included", priceLabel: "Included with Basic RC Room" },
  { id: "files-advanced", category: "files", name: "Advanced File Management", description: "For larger file collections: project folders, structured naming, advanced search, automatic classification and organized work sets.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "writer-project", category: "files", name: "Writer / Book Project", description: "Organize a book by title, chapters, drafts, research, references and supporting files so the Room can help assemble the manuscript.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "secure-share", category: "files", name: "Secure File Sharing", description: "Share selected files with approved professionals, staff or collaborators without exposing the entire Room.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "integration-learning", category: "education", name: "RC Connection Guide", description: "Learn what can be connected to a Royal Command Room: AI, Cloud Phone, accounting software, legal software, files, email, calendars, experts and business tools. Use this guide before deciding what to activate.", billing: "included", priceLabel: "Included" },
  { id: "education-basic", category: "education", name: "Learning / Study Workspace", description: "Organize course notes, assignments, learning files and AI study assistance inside the Room.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "training-business", category: "education", name: "Staff Training Workspace", description: "Create training materials, assignments and guided learning for staff or teams.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "esign", category: "business", name: "Electronic Signature", description: "Electronic signature workflow integration.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "invoice", category: "business", name: "Invoice / Receipt", description: "Invoice, receipt and related document workflows.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "payment", category: "business", name: "Payment", description: "Payment workflow integration when payment services are connected.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "calendar", category: "business", name: "Calendar", description: "Calendar, appointments, reminders and scheduling tools.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "customer-portal", category: "business", name: "Customer Portal", description: "Customer-facing secure portal connected to the Room.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "staff-accounts", category: "business", name: "Team Member Access", description: "Additional staff access with controlled permissions.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "mail-service", category: "mail", name: "Mail Receiving & Scan", description: "Receive physical mail at a designated service address, scan it to PDF and deliver it into the RC workflow where available.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "website-free", category: "website", name: "Starter Website Benefit", description: "Simple Starter Website support for eligible customers spending A$80+/month with RC.", billing: "included", priceLabel: "FREE when eligible", exclusiveGroup: "website-tier" },
  { id: "website-1", category: "website", name: "Starter Custom Site", description: "Custom website tier 1.", billing: "one_time", priceAud: 185, priceLabel: "From A$185", exclusiveGroup: "website-tier" },
  { id: "website-2", category: "website", name: "Small Business", description: "Custom website tier 2.", billing: "one_time", priceAud: 450, priceLabel: "From A$450", exclusiveGroup: "website-tier" },
  { id: "website-3", category: "website", name: "Business Plus", description: "Custom website tier 3.", billing: "one_time", priceAud: 1200, priceLabel: "From A$1,200", exclusiveGroup: "website-tier" },
  { id: "website-4", category: "website", name: "Professional", description: "Custom website tier 4.", billing: "one_time", priceAud: 3500, priceLabel: "From A$3,500", exclusiveGroup: "website-tier" },
  { id: "website-5", category: "website", name: "Advanced", description: "Custom website tier 5.", billing: "one_time", priceAud: 7500, priceLabel: "From A$7,500", exclusiveGroup: "website-tier" },
  { id: "website-6", category: "website", name: "Premium", description: "Consultation-based custom production.", billing: "quote", priceAud: 15000, priceLabel: "A$15,000+ · Consultation", consultation: true, exclusiveGroup: "website-tier" },
  { id: "website-7", category: "website", name: "Corporate", description: "Consultation-based custom production.", billing: "quote", priceAud: 35000, priceLabel: "A$35,000+ · Consultation", consultation: true, exclusiveGroup: "website-tier" },
  { id: "website-8", category: "website", name: "Enterprise", description: "Consultation-based custom production.", billing: "quote", priceAud: 75000, priceLabel: "A$75,000+ · Consultation", consultation: true, exclusiveGroup: "website-tier" },
  { id: "website-9", category: "website", name: "Global Enterprise", description: "Consultation-based custom production.", billing: "quote", priceAud: 150000, priceLabel: "A$150,000+ · Consultation", consultation: true, exclusiveGroup: "website-tier" },
  { id: "website-10", category: "website", name: "Royal Custom", description: "Large bespoke web platform project.", billing: "quote", priceAud: 360000, priceLabel: "A$360,000+ · Consultation", consultation: true, exclusiveGroup: "website-tier" },

  { id: "maintenance-basic", category: "maintenance", name: "Basic Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 35, exclusiveGroup: "maintenance-tier" },
  { id: "maintenance-business", category: "maintenance", name: "Business Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 80, exclusiveGroup: "maintenance-tier" },
  { id: "maintenance-professional", category: "maintenance", name: "Professional Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 150, exclusiveGroup: "maintenance-tier" },
  { id: "maintenance-advanced", category: "maintenance", name: "Advanced Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 300, exclusiveGroup: "maintenance-tier" },
  { id: "maintenance-premium", category: "maintenance", name: "Premium Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 600, exclusiveGroup: "maintenance-tier" },
];
