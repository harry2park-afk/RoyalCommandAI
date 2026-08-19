export type AppCategory =
  | "ai"
  | "communication"
  | "social"
  | "productivity"
  | "cloud"
  | "developer"
  | "commerce"
  | "payments"
  | "finance"
  | "media"
  | "telecom"
  | "internal";

export type AppAvailability = "global" | "regional";

export type AppItem = {
  id: string;
  title: string;
  description: string;
  url?: string;
  brandSlug?: string;
  brandColor?: string;
  fallback?: string;
  localLogo?: string;
  aliases?: string[];
  category: AppCategory;
  availability: AppAvailability;
  countries?: string[];
  regions?: string[];
};

// Royal Command Global Starter Pack: broad, familiar services shown by default.
// Customers can remove anything they do not want, while the larger catalog
// remains searchable for country- and region-specific additions.
export const DEFAULT_APPS = [
  "chatgpt",
  "claude",
  "gemini",
  "grok",
  "perplexity",
  "deepseek",
  "email",
  "drive",
  "calendar",
  "docs",
  "meet",
  "onedrive",
  "outlook",
  "teams",
  "facebook",
  "messenger",
  "whatsapp",
  "instagram",
  "x",
  "linkedin",
  "tiktok",
  "telegram",
  "discord",
  "slack",
  "zoom",
  "notion",
  "canva",
  "dropbox",
  "github",
  "vercel",
  "supabase",
  "amazon",
  "ebay",
  "shopify",
  "paypal",
  "stripe",
  "wise",
  "xero",
  "youtube",
  "netflix",
  "spotify",
  "kakaotalk",
  "naver",
  "line",
  "wechat",
  "shopee",
  "lazada",
  "files",
  "tasks",
  "approval",
] as const;

export const APP_CATALOG: AppItem[] = [
  // Royal Command / AI
  { id: "chatgpt", title: "ChatGPT", description: "내 ChatGPT", url: "https://chatgpt.com", localLogo: "/rc-ai-logos/openai.svg", brandSlug: "openai", brandColor: "FFFFFF", fallback: "◎", aliases: ["openai", "gpt", "챗지피티"], category: "ai", availability: "global" },
  { id: "claude", title: "Claude", description: "내 Claude", url: "https://claude.ai", brandSlug: "claude", brandColor: "D97757", fallback: "C", aliases: ["anthropic", "클로드"], category: "ai", availability: "global" },
  { id: "gemini", title: "Gemini", description: "내 Gemini", url: "https://gemini.google.com", brandSlug: "googlegemini", fallback: "G", aliases: ["google gemini", "제미나이", "구글제미나이"], category: "ai", availability: "global" },
  { id: "grok", title: "Grok", description: "내 Grok", url: "https://grok.com", fallback: "X", aliases: ["xai", "x ai", "그록"], category: "ai", availability: "global" },
  { id: "perplexity", title: "Perplexity", description: "AI search", url: "https://www.perplexity.ai", brandSlug: "perplexity", fallback: "P", aliases: ["perplexity ai", "퍼플렉시티"], category: "ai", availability: "global" },
  { id: "deepseek", title: "DeepSeek", description: "AI assistant", url: "https://chat.deepseek.com", fallback: "DS", aliases: ["deep seek", "딥시크"], category: "ai", availability: "global" },

  // Google / Microsoft productivity
  { id: "email", title: "Email", description: "내 이메일", url: "https://mail.google.com", brandSlug: "gmail", fallback: "M", aliases: ["gmail", "google mail", "메일", "지메일"], category: "productivity", availability: "global" },
  { id: "drive", title: "Google Drive", description: "내 Drive", url: "https://drive.google.com", brandSlug: "googledrive", fallback: "D", aliases: ["drive", "google drive", "드라이브", "구글드라이브"], category: "cloud", availability: "global" },
  { id: "calendar", title: "Google Calendar", description: "내 Calendar", url: "https://calendar.google.com", brandSlug: "googlecalendar", fallback: "31", aliases: ["calendar", "google calendar", "캘린더", "달력"], category: "productivity", availability: "global" },
  { id: "docs", title: "Documents", description: "문서 작업", url: "https://docs.google.com", brandSlug: "googledocs", fallback: "D", aliases: ["docs", "google docs", "document", "문서", "구글문서"], category: "productivity", availability: "global" },
  { id: "meet", title: "Google Meet", description: "Video meetings", url: "https://meet.google.com", brandSlug: "googlemeet", fallback: "GM", aliases: ["meet", "구글미트", "화상회의"], category: "communication", availability: "global" },
  { id: "onedrive", title: "OneDrive", description: "Microsoft cloud storage", url: "https://onedrive.live.com", brandSlug: "microsoftonedrive", fallback: "OD", aliases: ["one drive", "원드라이브"], category: "cloud", availability: "global" },
  { id: "outlook", title: "Outlook", description: "Microsoft email", url: "https://outlook.office.com", brandSlug: "microsoftoutlook", fallback: "O", aliases: ["office mail", "microsoft mail", "아웃룩"], category: "productivity", availability: "global" },
  { id: "teams", title: "Microsoft Teams", description: "Team collaboration", url: "https://teams.microsoft.com", brandSlug: "microsoftteams", fallback: "T", aliases: ["teams", "ms teams", "팀즈", "마이크로소프트 팀즈"], category: "communication", availability: "global" },

  // Social / messaging
  { id: "facebook", title: "Facebook", description: "Social network", url: "https://www.facebook.com", brandSlug: "facebook", fallback: "F", aliases: ["fb", "페이스북"], category: "social", availability: "global" },
  { id: "messenger", title: "Messenger", description: "Facebook Messenger", url: "https://www.messenger.com", brandSlug: "messenger", fallback: "M", aliases: ["facebook messenger", "메신저", "페이스북 메신저"], category: "communication", availability: "global" },
  { id: "whatsapp", title: "WhatsApp", description: "Messaging", url: "https://web.whatsapp.com", brandSlug: "whatsapp", fallback: "W", aliases: ["whats app", "왓츠앱", "와츠앱"], category: "communication", availability: "global" },
  { id: "instagram", title: "Instagram", description: "내 Instagram", url: "https://www.instagram.com", brandSlug: "instagram", fallback: "I", aliases: ["insta", "인스타", "인스타그램"], category: "social", availability: "global" },
  { id: "x", title: "X", description: "X social network", url: "https://x.com", brandSlug: "x", brandColor: "FFFFFF", fallback: "X", aliases: ["twitter", "트위터", "엑스"], category: "social", availability: "global" },
  { id: "linkedin", title: "LinkedIn", description: "Professional network", url: "https://www.linkedin.com", brandSlug: "linkedin", fallback: "in", aliases: ["linked in", "링크드인"], category: "social", availability: "global" },
  { id: "tiktok", title: "TikTok", description: "Short video", url: "https://www.tiktok.com", brandSlug: "tiktok", fallback: "TT", aliases: ["tik tok", "틱톡"], category: "social", availability: "global" },
  { id: "telegram", title: "Telegram", description: "Messaging", url: "https://web.telegram.org", brandSlug: "telegram", fallback: "TG", aliases: ["텔레그램"], category: "communication", availability: "global" },
  { id: "discord", title: "Discord", description: "Community chat", url: "https://discord.com/app", brandSlug: "discord", fallback: "D", aliases: ["디스코드"], category: "communication", availability: "global" },
  { id: "reddit", title: "Reddit", description: "Communities", url: "https://www.reddit.com", brandSlug: "reddit", fallback: "R", aliases: ["레딧"], category: "social", availability: "global" },

  // Collaboration / work
  { id: "slack", title: "Slack", description: "Work messaging", url: "https://app.slack.com", brandSlug: "slack", fallback: "S", aliases: ["슬랙"], category: "communication", availability: "global" },
  { id: "zoom", title: "Zoom", description: "Video meetings", url: "https://zoom.us", brandSlug: "zoom", fallback: "Z", aliases: ["zoom meetings", "줌"], category: "communication", availability: "global" },
  { id: "notion", title: "Notion", description: "Workspace", url: "https://www.notion.so", brandSlug: "notion", brandColor: "FFFFFF", fallback: "N", aliases: ["노션"], category: "productivity", availability: "global" },
  { id: "canva", title: "Canva", description: "Design workspace", url: "https://www.canva.com", brandSlug: "canva", fallback: "C", aliases: ["캔바"], category: "productivity", availability: "global" },
  { id: "dropbox", title: "Dropbox", description: "Cloud storage", url: "https://www.dropbox.com", brandSlug: "dropbox", fallback: "DB", aliases: ["drop box", "드롭박스"], category: "cloud", availability: "global" },

  // Developer / platform
  { id: "github", title: "GitHub", description: "내 GitHub", url: "https://github.com", brandSlug: "github", brandColor: "FFFFFF", fallback: "GH", aliases: ["github", "git hub", "git", "깃허브", "깃헙"], category: "developer", availability: "global" },
  { id: "vercel", title: "Vercel", description: "Cloud deployment", url: "https://vercel.com", brandSlug: "vercel", brandColor: "FFFFFF", fallback: "V", aliases: ["버셀", "배포"], category: "developer", availability: "global" },
  { id: "supabase", title: "Supabase", description: "Database platform", url: "https://supabase.com/dashboard", brandSlug: "supabase", fallback: "S", aliases: ["수파베이스", "database", "db"], category: "developer", availability: "global" },

  // Commerce / payments / finance
  { id: "amazon", title: "Amazon", description: "Marketplace", url: "https://www.amazon.com", brandSlug: "amazon", fallback: "A", aliases: ["아마존"], category: "commerce", availability: "global" },
  { id: "ebay", title: "eBay", description: "Marketplace", url: "https://www.ebay.com", brandSlug: "ebay", fallback: "E", aliases: ["이베이"], category: "commerce", availability: "global" },
  { id: "shopify", title: "Shopify", description: "Commerce platform", url: "https://admin.shopify.com", brandSlug: "shopify", fallback: "S", aliases: ["쇼피파이"], category: "commerce", availability: "global" },
  { id: "paypal", title: "PayPal", description: "Payments", url: "https://www.paypal.com", brandSlug: "paypal", fallback: "P", aliases: ["pay pal", "페이팔"], category: "payments", availability: "global" },
  { id: "stripe", title: "Stripe", description: "Payments dashboard", url: "https://dashboard.stripe.com", brandSlug: "stripe", fallback: "S", aliases: ["스트라이프"], category: "payments", availability: "global" },
  { id: "wise", title: "Wise", description: "International payments", url: "https://wise.com", brandSlug: "wise", fallback: "W", aliases: ["transferwise", "와이즈"], category: "finance", availability: "global" },
  { id: "xero", title: "Xero", description: "Accounting", url: "https://login.xero.com", brandSlug: "xero", fallback: "X", aliases: ["제로 회계", "accounting"], category: "finance", availability: "global" },
  { id: "myob", title: "MYOB", description: "Business accounting", url: "https://www.myob.com", fallback: "MY", aliases: ["myob accounting", "마이옵"], category: "finance", availability: "regional", countries: ["AU", "NZ"], regions: ["oceania"] },

  // Media
  { id: "youtube", title: "YouTube", description: "내 YouTube", url: "https://www.youtube.com", brandSlug: "youtube", brandColor: "FF0000", fallback: "▶", aliases: ["yt", "유튜브"], category: "media", availability: "global" },
  { id: "netflix", title: "Netflix", description: "내 Netflix", url: "https://www.netflix.com", brandSlug: "netflix", brandColor: "E50914", fallback: "N", aliases: ["넷플릭스"], category: "media", availability: "global" },
  { id: "spotify", title: "Spotify", description: "Music", url: "https://open.spotify.com", brandSlug: "spotify", fallback: "SP", aliases: ["스포티파이"], category: "media", availability: "global" },

  // Korea / Japan / Greater China / Asia regional services
  { id: "kakaotalk", title: "KakaoTalk", description: "Korean messaging", url: "https://www.kakaocorp.com/page/service/service/KakaoTalk", fallback: "K", aliases: ["kakao talk", "kakao", "카카오톡", "카톡", "카카오"], category: "communication", availability: "regional", countries: ["KR"], regions: ["asia"] },
  { id: "naver", title: "Naver", description: "Korean portal", url: "https://www.naver.com", fallback: "N", aliases: ["네이버"], category: "productivity", availability: "regional", countries: ["KR"], regions: ["asia"] },
  { id: "line", title: "LINE", description: "Messaging", url: "https://line.me", brandSlug: "line", fallback: "L", aliases: ["라인", "line messenger"], category: "communication", availability: "regional", countries: ["JP", "TW", "TH"], regions: ["asia"] },
  { id: "wechat", title: "WeChat", description: "Messaging and services", url: "https://www.wechat.com", brandSlug: "wechat", fallback: "WC", aliases: ["we chat", "위챗", "微信"], category: "communication", availability: "regional", countries: ["CN"], regions: ["asia"] },
  { id: "qq", title: "QQ", description: "Tencent messaging", url: "https://im.qq.com", fallback: "QQ", aliases: ["tencent qq", "큐큐"], category: "communication", availability: "regional", countries: ["CN"], regions: ["asia"] },
  { id: "weibo", title: "Weibo", description: "Chinese social network", url: "https://weibo.com", brandSlug: "sinaweibo", fallback: "WB", aliases: ["sina weibo", "웨이보", "微博"], category: "social", availability: "regional", countries: ["CN"], regions: ["asia"] },
  { id: "baidu", title: "Baidu", description: "Chinese search and services", url: "https://www.baidu.com", brandSlug: "baidu", fallback: "B", aliases: ["바이두", "百度"], category: "productivity", availability: "regional", countries: ["CN"], regions: ["asia"] },
  { id: "douyin", title: "Douyin", description: "Chinese short video", url: "https://www.douyin.com", brandSlug: "douyin", fallback: "DY", aliases: ["抖音", "도우인", "china tiktok"], category: "social", availability: "regional", countries: ["CN"], regions: ["asia"] },
  { id: "shopee", title: "Shopee", description: "Southeast Asia marketplace", url: "https://shopee.com", brandSlug: "shopee", fallback: "SH", aliases: ["쇼피"], category: "commerce", availability: "regional", countries: ["SG", "MY", "TH", "VN", "PH", "ID", "TW"], regions: ["asia"] },
  { id: "lazada", title: "Lazada", description: "Southeast Asia marketplace", url: "https://www.lazada.com", brandSlug: "lazada", fallback: "LZ", aliases: ["라자다"], category: "commerce", availability: "regional", countries: ["SG", "MY", "TH", "VN", "PH", "ID"], regions: ["asia"] },

  // Other large regional platforms
  { id: "vk", title: "VK", description: "Social network", url: "https://vk.com", brandSlug: "vk", fallback: "VK", aliases: ["vkontakte", "브이케이"], category: "social", availability: "regional", regions: ["europe", "eurasia"] },
  { id: "yandex", title: "Yandex", description: "Search and services", url: "https://yandex.com", brandSlug: "yandex", fallback: "Y", aliases: ["얀덱스"], category: "productivity", availability: "regional", regions: ["europe", "eurasia"] },
  { id: "mercadolibre", title: "Mercado Libre", description: "Latin America marketplace", url: "https://www.mercadolibre.com", brandSlug: "mercadolibre", fallback: "ML", aliases: ["mercado libre", "메르카도 리브레"], category: "commerce", availability: "regional", regions: ["latin-america"] },

  // Telecom / current Royal Command tools
  { id: "crazytel", title: "Crazytel", description: "Crazytel 고객 포털", url: "https://portal.crazytel.com.au", fallback: "CT", aliases: ["crazytel", "crazy tel", "crazyphone", "crazy phone", "크레이지텔", "크레이지 텔", "크레이지폰"], category: "telecom", availability: "regional", countries: ["AU"], regions: ["oceania"] },

  // Local-only Royal Command menu functions
  { id: "files", title: "My Files", description: "내 컴퓨터 파일", fallback: "F", aliases: ["file", "files", "파일", "내파일"], category: "internal", availability: "global" },
  { id: "tasks", title: "Tasks", description: "내 할 일 관리", fallback: "✓", aliases: ["task", "todo", "할일", "할 일"], category: "internal", availability: "global" },
  { id: "approval", title: "Approval", description: "승인 작업 보기", fallback: "A", aliases: ["approve", "approval", "승인"], category: "internal", availability: "global" },
];

export function appSearchText(app: AppItem) {
  return [
    app.id,
    app.title,
    app.description,
    app.brandSlug || "",
    app.url || "",
    app.category,
    app.availability,
    ...(app.aliases || []),
    ...(app.countries || []),
    ...(app.regions || []),
  ].join(" ").toLowerCase();
}

export function findAppById(id: string) {
  return APP_CATALOG.find((app) => app.id === id);
}

export function searchGlobalApps(query: string) {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];
  return APP_CATALOG.filter((app) => appSearchText(app).includes(clean));
}

export function listAppsForCountry(countryCode?: string) {
  const code = countryCode?.trim().toUpperCase();
  if (!code) return APP_CATALOG;
  return APP_CATALOG.filter((app) => app.availability === "global" || app.countries?.includes(code));
}
