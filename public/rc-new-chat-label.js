(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const BUTTON_ID = "rc-new-chat-button";

  function updateLabel() {
    const button = document.getElementById(BUTTON_ID);
    if (!(button instanceof HTMLButtonElement)) return;

    button.style.whiteSpace = "nowrap";
    button.style.lineHeight = "1";
    button.style.overflow = "hidden";

    if (button.dataset.rcCompactChatLabel === "1") return;
    button.dataset.rcCompactChatLabel = "1";
    button.textContent = "";

    const prefix = document.createElement("span");
    prefix.textContent = "+ New ";

    const chat = document.createElement("span");
    chat.textContent = "Chat";
    chat.style.fontSize = "0.82em";

    button.append(prefix, chat);
  }

  const observer = new MutationObserver(updateLabel);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  requestAnimationFrame(updateLabel);
})();
