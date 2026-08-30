export type ConnectorCatalogCategory = "ai" | "tools" | "services";
export type ConnectorCatalogStatus = "request" | "coming_soon";

export type ConnectorCatalogItem = {
  id: string;
  name: string;
  category: ConnectorCatalogCategory;
  featured: boolean;
  status: ConnectorCatalogStatus;
};

const AI = [
  "ChatGPT","Claude","Gemini","Grok","OpenAI Codex","DeepSeek","Perplexity","Mistral","Meta Llama","Qwen",
  "Cohere","Kimi / Moonshot AI","MiniMax","Z.ai / GLM","Microsoft Phi","Amazon Nova","NVIDIA Nemotron","AI21","Nous Research","Writer",
  "StepFun","Inception Mercury","Liquid AI","Arcee AI","01.AI / Yi","Tencent Hunyuan","IBM Granite","Google Gemma","Microsoft Copilot","GitHub Copilot",
  "Cursor AI","Replit AI","Tabnine","Sourcegraph Cody","Windsurf","Poe","You.com AI","Character.AI","Hugging Face","Together AI",
  "Fireworks AI","Groq","Cerebras","SambaNova","Databricks Mosaic AI","Snowflake Cortex","Anthropic Computer Use","Adobe Firefly","Canva Magic Studio","Runway",
];

const TOOLS = [
  "Gmail","Microsoft Outlook","Google Calendar","Microsoft Calendar","Google Drive","Microsoft OneDrive","Dropbox","Box","Slack","Microsoft Teams",
  "Zoom","Google Meet","Notion","Trello","Asana","Monday.com","ClickUp","Jira","Confluence","GitHub",
  "GitLab","Bitbucket","Vercel","Supabase","AWS","Microsoft Azure","Google Cloud","Salesforce","HubSpot","Zoho CRM",
  "Xero","MYOB","QuickBooks","Stripe","PayPal","Square","DocuSign","Adobe Acrobat Sign","Canva","Shopify",
  "WooCommerce","WordPress","Airtable","Zapier","Make","Twilio","Mailchimp","Calendly","Typeform","Google Sheets",
];

const SERVICES = [
  "Legal Advice","Accounting","Tax & GST","Bookkeeping","Payroll","Business Registration","Company Secretarial","Contract Review","E-Signature Support","Employment & HR",
  "Immigration","Intellectual Property","Patent Support","Trademark Support","Insurance","Banking Assistance","Business Finance","Loans & Lending","Financial Planning","Property Services",
  "Real Estate","Property Management","Mortgage Assistance","Valuation","Conveyancing","Phone & Telephony","Virtual Reception","SMS & Messaging","Email Administration","Document Management",
  "File Storage","Translation","Interpreting","Travel Booking","Flights","Hotels","Car Rental","Visa & Travel Documents","Medical Administration","Telehealth Coordination",
  "Education & Training","Recruitment","Background Checks","Marketing Services","Advertising","Social Media Management","Video Production","Music & Audio","Sports Services","Expert Marketplace",
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function build(category: ConnectorCatalogCategory, names: string[]): ConnectorCatalogItem[] {
  return names.map((name, index) => ({
    id: `${category}:${slug(name)}`,
    name,
    category,
    featured: index < 30,
    status: index < 30 ? "request" : "coming_soon",
  }));
}

export const ROOM_CONNECTOR_CATALOG: ConnectorCatalogItem[] = [
  ...build("ai", AI),
  ...build("tools", TOOLS),
  ...build("services", SERVICES),
];

export const ROOM_CONNECTOR_COUNTS = {
  ai: AI.length,
  tools: TOOLS.length,
  services: SERVICES.length,
  total: AI.length + TOOLS.length + SERVICES.length,
};
