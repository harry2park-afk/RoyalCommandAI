export type RoomMaterial = {
  id: string;
  name: string;
  category: "core" | "ai" | "tool" | "memory" | "knowledge" | "permission" | "approval" | "connection" | "website" | "automation" | "ui";
  risk: "low" | "medium" | "high";
  required?: boolean;
  description: string;
};

export const ROOM_MATERIALS: RoomMaterial[] = [
  { id: "data-isolation", name: "Data Isolation Boundary", category: "core", risk: "low", required: true, description: "Keeps each customer Room and its data isolated." },
  { id: "room-identity", name: "Room Identity", category: "core", risk: "low", required: true, description: "Room name, purpose and owner." },
  { id: "room-history", name: "Conversation History", category: "core", risk: "low", required: true, description: "Stores Room conversations separately from AI memory." },
  { id: "primary-ai", name: "Primary AI", category: "ai", risk: "low", required: true, description: "Main AI used by the Room." },
  { id: "supporting-ai", name: "Supporting AI", category: "ai", risk: "low", description: "Optional second AI for review or specialist work." },
  { id: "room-memory", name: "Room Memory", category: "memory", risk: "medium", required: true, description: "Remembers approved Room-specific context." },
  { id: "business-memory", name: "Business Memory", category: "memory", risk: "medium", description: "Uses customer-approved shared business context." },
  { id: "document-reader", name: "Document Reader", category: "knowledge", risk: "low", description: "Reads PDF, Word and other Room documents." },
  { id: "spreadsheet", name: "Spreadsheet", category: "tool", risk: "medium", description: "Works with tables, calculations and structured data." },
  { id: "web-search", name: "Web Search", category: "tool", risk: "low", description: "Uses current public web information when enabled." },
  { id: "email-draft", name: "Email Draft", category: "tool", risk: "low", description: "Creates email drafts without sending." },
  { id: "email-send", name: "Email Send", category: "tool", risk: "high", description: "Sends email after configured approval." },
  { id: "calendar", name: "Calendar", category: "tool", risk: "medium", description: "Reads or creates calendar events within permissions." },
  { id: "crm", name: "CRM", category: "connection", risk: "medium", description: "Connects approved customer relationship data." },
  { id: "database-read", name: "Database Read", category: "tool", risk: "medium", description: "Reads approved database records." },
  { id: "database-write", name: "Database Write", category: "tool", risk: "high", description: "Changes approved database records with safeguards." },
  { id: "github", name: "GitHub", category: "connection", risk: "medium", description: "Connects repositories, issues and pull requests." },
  { id: "vercel", name: "Vercel", category: "connection", risk: "high", description: "Connects deployment and hosting workflows." },
  { id: "phone", name: "Phone", category: "connection", risk: "medium", description: "Connects approved voice workflows." },
  { id: "sms", name: "SMS", category: "connection", risk: "high", description: "Sends or receives SMS within approval policy." },
  { id: "esign", name: "E-signature", category: "connection", risk: "high", description: "Connects document signing workflows." },
  { id: "owner-role", name: "Owner Permission", category: "permission", risk: "low", required: true, description: "Full Room ownership and configuration rights." },
  { id: "staff-role", name: "Staff Permission", category: "permission", risk: "medium", description: "Controlled staff access." },
  { id: "viewer-role", name: "Viewer Permission", category: "permission", risk: "low", description: "Read-only Room access." },
  { id: "human-approval", name: "Human Approval Gate", category: "approval", risk: "low", required: true, description: "Stops important actions until a human approves." },
  { id: "external-send-approval", name: "External Send Approval", category: "approval", risk: "low", description: "Requires approval before external sending." },
  { id: "delete-approval", name: "Delete Approval", category: "approval", risk: "low", description: "Requires approval before destructive deletion." },
  { id: "website-reader", name: "Website Connection", category: "website", risk: "low", description: "Reads approved website pages, FAQ and product information." },
  { id: "website-builder", name: "Website Builder Kit", category: "website", risk: "medium", description: "AI-assisted website structure, pages, forms, preview and deployment preparation." },
  { id: "automation", name: "Automation", category: "automation", risk: "medium", description: "Runs approved scheduled or event-driven Room workflows." },
  { id: "preview", name: "Preview & Test", category: "ui", risk: "low", required: true, description: "Tests the Room before activation." },
];

export const TEMPLATE_MATERIAL_PRESETS: Record<string, string[]> = {
  legal: ["data-isolation", "room-identity", "room-history", "primary-ai", "supporting-ai", "room-memory", "document-reader", "web-search", "email-draft", "email-send", "esign", "owner-role", "staff-role", "human-approval", "external-send-approval", "preview"],
  accounting: ["data-isolation", "room-identity", "room-history", "primary-ai", "room-memory", "document-reader", "spreadsheet", "email-draft", "owner-role", "staff-role", "human-approval", "external-send-approval", "preview"],
  business: ["data-isolation", "room-identity", "room-history", "primary-ai", "supporting-ai", "room-memory", "document-reader", "email-draft", "calendar", "crm", "owner-role", "staff-role", "human-approval", "preview"],
  technology: ["data-isolation", "room-identity", "room-history", "primary-ai", "supporting-ai", "room-memory", "document-reader", "web-search", "github", "vercel", "database-read", "owner-role", "staff-role", "human-approval", "delete-approval", "preview"],
  education: ["data-isolation", "room-identity", "room-history", "primary-ai", "room-memory", "document-reader", "web-search", "calendar", "owner-role", "viewer-role", "preview"],
  custom: ["data-isolation", "room-identity", "room-history", "primary-ai", "room-memory", "owner-role", "human-approval", "preview"],
};
