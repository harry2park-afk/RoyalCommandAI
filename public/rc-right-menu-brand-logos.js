(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const SERVICE_DOMAINS = {
    ChatGPT: "chatgpt.com",
    Claude: "claude.ai",
    Gemini: "gemini.google.com",
    Grok: "grok.com",
    Perplexity: "perplexity.ai",
    DeepSeek: "chat.deepseek.com",
    Email: "mail.google.com",
    "Google Drive": "drive.google.com",
    "Google Calendar": "calendar.google.com",
    Documents: "docs.google.com",
    "Google Meet": "meet.google.com",
    OneDrive: "onedrive.live.com",
    Outlook: "outlook.office.com",
    "Microsoft Teams": "teams.microsoft.com",
    Facebook: "facebook.com",
    Messenger: "messenger.com",
    WhatsApp: "web.whatsapp.com",
    Instagram: "instagram.com",
    X: "x.com",
    LinkedIn: "linkedin.com",
    TikTok: "tiktok.com",
    Telegram: "web.telegram.org",
    Discord: "discord.com",
    Slack: "app.slack.com",
    Zoom: "zoom.us",
    Notion: "notion.so",
    Canva: "canva.com",
    Dropbox: "dropbox.com",
    GitHub: "github.com",
    Vercel: "vercel.com",
    Supabase: "supabase.com",
    Amazon: "amazon.com",
    eBay: "ebay.com",
    Shopify: "shopify.com",
    PayPal: "paypal.com",
    Stripe: "stripe.com",
    Wise: "wise.com",
    Xero: "xero.com",
    YouTube: "youtube.com",
    Netflix: "netflix.com",
    Spotify: "spotify.com",
    Naver: "naver.com",
    LINE: "line.me",
    WeChat: "wechat.com",
    Shopee: "shopee.com",
    Lazada: "lazada.com",
  };

  const SPECIAL_ICONS = {
    KakaoTalk: "/brand-logos/kakaotalk.svg",
  };

  function favicon(domain) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  }

  function installBrandLogo(button, src) {
    const current = button.querySelector("img");
    if (current) {
      if (!current.dataset.rcOriginalSrc) current.dataset.rcOriginalSrc = current.getAttribute("src") || "";
      if (current.getAttribute("src") === src) return;
      current.onerror = () => {
        const fallback = current.dataset.rcOriginalSrc;
        if (fallback && current.getAttribute("src") !== fallback) current.setAttribute("src", fallback);
      };
      current.setAttribute("src", src);
      current.className = "h-5 w-5 shrink-0 object-contain";
      return;
    }

    const first = button.firstElementChild;
    if (!first) return;
    const placeholder = first.cloneNode(true);
    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    image.draggable = false;
    image.className = "h-5 w-5 shrink-0 object-contain";
    image.onerror = () => {
      if (image.parentNode) image.replaceWith(placeholder);
    };
    first.replaceWith(image);
  }

  function apply() {
    const sidebar = document.querySelector(".rc-right-work-sidebar");
    if (!sidebar) return;

    for (const button of sidebar.querySelectorAll("button.rc-right-app-button")) {
      const title = (button.getAttribute("title") || "").trim();
      const special = SPECIAL_ICONS[title];
      const domain = SERVICE_DOMAINS[title];
      const src = special || (domain ? favicon(domain) : "");
      if (src) installBrandLogo(button, src);
    }
  }

  let timer = 0;
  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, 80);
  }

  apply();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("pageshow", schedule);
})();
