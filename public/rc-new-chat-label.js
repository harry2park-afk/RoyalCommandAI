(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const BUTTON_ID = "rc-new-chat-button";

  function updateLabel() {
    const button = document.getElementById(BUTTON_ID);
    if (!(button instanceof HTMLButtonElement)) return;

    button.style.whiteSpace = "nowrap";
    button.style.lineHeight = "1";
    button.style.overflow = "hidden";

    const width = button.getBoundingClientRect().width;
    const next = width > 78 ? "+ New Chat" : "+ Chat";
    if (button.textContent !== next) button.textContent = next;
  }

  const observer = new MutationObserver(updateLabel);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", updateLabel);
  requestAnimationFrame(updateLabel);
})();
