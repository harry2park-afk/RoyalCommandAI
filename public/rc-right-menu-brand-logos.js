(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const BRAND_LOGOS = {
    Grok: "/rc-ai-logos/xai.svg",
    DeepSeek: "/brand-logos/deepseek.svg",
    KakaoTalk: "/brand-logos/kakaotalk.svg",
    Naver: "https://cdn.simpleicons.org/naver/03C75A",
  };

  function installBrandLogo(button, src) {
    const current = button.querySelector("img");
    if (current) {
      if (current.getAttribute("src") !== src) current.setAttribute("src", src);
      return;
    }

    const first = button.firstElementChild;
    if (!first) return;

    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    image.draggable = false;
    image.className = "h-5 w-5 shrink-0 object-contain";
    first.replaceWith(image);
  }

  function apply() {
    const sidebar = document.querySelector(".rc-right-work-sidebar");
    if (!sidebar) return;

    for (const button of sidebar.querySelectorAll("button.rc-right-app-button")) {
      const title = (button.getAttribute("title") || "").trim();
      const src = BRAND_LOGOS[title];
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
