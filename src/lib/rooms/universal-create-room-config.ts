export type BillingType = "monthly" | "one_time" | "quote" | "included";

export type CatalogItem = {
  id: string;
  category: "ai" | "secretary" | "communication" | "business" | "mail" | "website" | "maintenance";
  name: string;
  description: string;
  billing: BillingType;
  priceAud?: number;
  priceLabel?: string;
  consultation?: boolean;
  includedIn?: string[];
};

export type IndustryProfile = {
  id: string;
  label: string;
  keywords: string[];
  recommended: string[];
};

export const CREATE_ROOM_FORM_VERSION = "0.2";
export const BASIC_ROOM_MONTHLY_AUD = 3.8;
export const BASIC_TRIAL_DAYS = 30;
export const PROMOTION_PERCENT = 30;
export const WEBSITE_BENEFIT_THRESHOLD_AUD = 80;

export const INDUSTRIES: IndustryProfile[] = [
  { id: "accountant", label: "Accountant", keywords: ["accountant", "accounting", "회계", "세무", "gst", "bas"], recommended: ["ai-chatgpt", "secretary-basic", "booking", "sms", "document-upload", "invoice", "calendar"] },
  { id: "legal", label: "Legal", keywords: ["legal", "law", "lawyer", "변호사", "법률"], recommended: ["ai-claude", "secretary-basic", "booking", "document-upload", "esign", "calendar"] },
  { id: "real-estate", label: "Real Estate", keywords: ["real estate", "property", "부동산"], recommended: ["ai-chatgpt", "secretary-basic", "incoming-calls", "outgoing-calls", "booking", "sms", "calendar"] },
  { id: "medical", label: "Medical / Health", keywords: ["medical", "clinic", "doctor", "health", "의료", "병원"], recommended: ["ai-gemini", "secretary-basic", "booking", "sms", "document-upload", "calendar"] },
  { id: "insurance", label: "Insurance", keywords: ["insurance", "보험"], recommended: ["ai-chatgpt", "secretary-basic", "incoming-calls", "document-upload", "esign"] },
  { id: "trading", label: "Trading / Import-Export", keywords: ["trading", "import", "export", "무역", "수입", "수출"], recommended: ["ai-chatgpt", "email", "document-upload", "invoice", "calendar"] },
  { id: "general", label: "General Business", keywords: [], recommended: ["ai-chatgpt", "calendar", "document-upload"] },
];

export const CATALOG: CatalogItem[] = [
  { id: "ai-own", category: "ai", name: "Use my own AI account", description: "Connect your own supported AI account/API.", billing: "included", priceLabel: "No RC AI fee" },
  { id: "ai-chatgpt", category: "ai", name: "ChatGPT", description: "RC-provided AI access plan.", billing: "monthly", priceAud: 28 },
  { id: "ai-claude", category: "ai", name: "Claude", description: "RC-provided AI access plan.", billing: "monthly", priceAud: 28 },
  { id: "ai-gemini", category: "ai", name: "Gemini", description: "RC-provided AI access plan.", billing: "monthly", priceAud: 28 },
  { id: "ai-grok", category: "ai", name: "Grok", description: "RC-provided AI access plan.", billing: "monthly", priceAud: 28 },

  { id: "secretary-basic", category: "secretary", name: "Basic AI Secretary", description: "Entry-level assistant service. Final inclusions can be adjusted before launch.", billing: "monthly", priceAud: 80 },
  { id: "secretary-2", category: "secretary", name: "AI Secretary Level 2", description: "Expanded office assistance.", billing: "monthly", priceAud: 120 },
  { id: "secretary-3", category: "secretary", name: "AI Secretary Level 3", description: "Office support with broader automation.", billing: "monthly", priceAud: 160 },
  { id: "secretary-4", category: "secretary", name: "AI Secretary Level 4", description: "Professional assistant tier.", billing: "monthly", priceAud: 220 },
  { id: "secretary-5", category: "secretary", name: "AI Secretary Level 5", description: "Executive assistant tier.", billing: "monthly", priceAud: 290 },
  { id: "secretary-6", category: "secretary", name: "AI Secretary Level 6", description: "Advanced executive assistance.", billing: "monthly", priceAud: 360 },
  { id: "secretary-7", category: "secretary", name: "AI Secretary Level 7", description: "Senior executive assistance.", billing: "monthly", priceAud: 430 },
  { id: "secretary-8", category: "secretary", name: "AI Secretary Level 8", description: "Director-level office automation.", billing: "monthly", priceAud: 500 },
  { id: "secretary-9", category: "secretary", name: "AI Secretary Level 9", description: "Premier business assistance.", billing: "monthly", priceAud: 575 },
  { id: "secretary-10", category: "secretary", name: "Royal Executive", description: "Top tier with two AI secretaries and advanced office support.", billing: "monthly", priceAud: 650 },

  { id: "incoming-calls", category: "communication", name: "Incoming Calls", description: "AI receptionist answers inbound calls.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "outgoing-calls", category: "communication", name: "Outgoing Calls", description: "Approved outbound calls, follow-ups and confirmations.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "booking", category: "communication", name: "Appointment Booking", description: "Book, confirm and update appointments.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "sms", category: "communication", name: "SMS Send / Receive", description: "Two-way SMS and reminders.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "email", category: "communication", name: "Email Assistance", description: "Email support and customer follow-up.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "document-upload", category: "business", name: "Secure Document Upload", description: "Secure document intake for the Room.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "esign", category: "business", name: "Electronic Signature", description: "Electronic signature workflow integration.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "invoice", category: "business", name: "Invoice / Receipt", description: "Invoice and receipt workflow tools.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "payment", category: "business", name: "Payment", description: "Payment workflow integration.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "calendar", category: "business", name: "Calendar", description: "Calendar and scheduling tools.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "customer-portal", category: "business", name: "Customer Portal", description: "Customer-facing secure portal.", billing: "monthly", priceLabel: "Price to confirm" },
  { id: "staff-accounts", category: "business", name: "Team Member Access", description: "Additional staff access and permissions.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "mail-service", category: "mail", name: "Mail Receiving & Scan", description: "Mail received at the designated Claude Office address, scanned to PDF and delivered by email/RC Room.", billing: "monthly", priceLabel: "Price to confirm" },

  { id: "website-free", category: "website", name: "Starter Website Benefit", description: "Simple Starter Website support for eligible customers spending A$80+/month with RC.", billing: "included", priceLabel: "FREE when eligible" },
  { id: "website-1", category: "website", name: "Starter Custom Site", description: "Custom website tier 1.", billing: "one_time", priceAud: 185, priceLabel: "From A$185" },
  { id: "website-2", category: "website", name: "Small Business", description: "Custom website tier 2.", billing: "one_time", priceAud: 450, priceLabel: "From A$450" },
  { id: "website-3", category: "website", name: "Business Plus", description: "Custom website tier 3.", billing: "one_time", priceAud: 1200, priceLabel: "From A$1,200" },
  { id: "website-4", category: "website", name: "Professional", description: "Custom website tier 4.", billing: "one_time", priceAud: 3500, priceLabel: "From A$3,500" },
  { id: "website-5", category: "website", name: "Advanced", description: "Custom website tier 5.", billing: "one_time", priceAud: 7500, priceLabel: "From A$7,500" },
  { id: "website-6", category: "website", name: "Premium", description: "Consultation-based custom production.", billing: "quote", priceAud: 15000, priceLabel: "A$15,000+ · Consultation", consultation: true },
  { id: "website-7", category: "website", name: "Corporate", description: "Consultation-based custom production.", billing: "quote", priceAud: 35000, priceLabel: "A$35,000+ · Consultation", consultation: true },
  { id: "website-8", category: "website", name: "Enterprise", description: "Consultation-based custom production.", billing: "quote", priceAud: 75000, priceLabel: "A$75,000+ · Consultation", consultation: true },
  { id: "website-9", category: "website", name: "Global Enterprise", description: "Consultation-based custom production.", billing: "quote", priceAud: 150000, priceLabel: "A$150,000+ · Consultation", consultation: true },
  { id: "website-10", category: "website", name: "Royal Custom", description: "Large bespoke web platform project.", billing: "quote", priceAud: 360000, priceLabel: "A$360,000+ · Consultation", consultation: true },

  { id: "maintenance-basic", category: "maintenance", name: "Basic Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 35 },
  { id: "maintenance-business", category: "maintenance", name: "Business Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 80 },
  { id: "maintenance-professional", category: "maintenance", name: "Professional Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 150 },
  { id: "maintenance-advanced", category: "maintenance", name: "Advanced Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 300 },
  { id: "maintenance-premium", category: "maintenance", name: "Premium Care", description: "Website maintenance and upgrades.", billing: "monthly", priceAud: 600 },
];
