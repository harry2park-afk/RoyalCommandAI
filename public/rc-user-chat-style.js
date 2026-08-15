(() => {
  if (!location.pathname.startsWith('/rooms/')) return;

  function styleUserMessages() {
    document.querySelectorAll('button[title="클릭하면 전체 내용을 봅니다"]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.style.setProperty('background', '#1E3A8A', 'important');
      button.style.setProperty('color', '#FFFFFF', 'important');
      button.style.setProperty('border', '3px solid #FFD700', 'important');

      // Keep the original full width. Compress only the vertical height by about 25%.
      button.style.setProperty('width', '100%', 'important');
      button.style.setProperty('max-width', 'none', 'important');
      button.style.setProperty('margin-left', '0', 'important');
      button.style.setProperty('margin-right', '0', 'important');
      button.style.setProperty('height', '33px', 'important');
      button.style.setProperty('min-height', '33px', 'important');
      button.style.setProperty('padding-top', '2px', 'important');
      button.style.setProperty('padding-bottom', '2px', 'important');
      button.style.setProperty('border-radius', '7px 7px 1px 7px', 'important');
      button.style.setProperty('box-shadow', 'none', 'important');

      const label = button.querySelector(':scope > span:first-child');
      if (label instanceof HTMLElement && label.textContent?.trim().toLowerCase() === 'you') {
        label.style.setProperty('display', 'none', 'important');
      }

      const text = button.querySelector(':scope > span:last-child');
      if (text instanceof HTMLElement) {
        text.style.setProperty('color', '#FFFFFF', 'important');
        text.style.setProperty('line-height', '1.15', 'important');
      }
    });
  }

  styleUserMessages();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      styleUserMessages();
    });
  }).observe(document.body, { childList: true, subtree: true });
})();