(() => {
  if (!location.pathname.startsWith('/rooms/')) return;

  const ROYAL_BLUE = '#4169E1';
  const ROYAL_BLUE_DARK = '#1D4ED8';
  const LIGHT_BLUE = '#EAF4FF';
  const LIGHT_BLUE_ACTIVE = '#D7EAFF';
  const TEXT_BLUE = '#0B1F3A';

  function applyRoomHeaderStyle() {
    const dashboard = document.querySelector('a[href="/dashboard"]');
    if (!(dashboard instanceof HTMLElement)) return;

    const headerRow = dashboard.parentElement;
    if (!(headerRow instanceof HTMLElement)) return;

    const title = [...headerRow.querySelectorAll('h1')].find((el) => el.textContent?.trim() === 'Command Room');
    if (title instanceof HTMLElement) {
      title.style.fontFamily = 'var(--font-display), serif';
      title.style.fontSize = '30px';
      title.style.fontWeight = '600';
      title.style.lineHeight = '1';
      title.style.letterSpacing = '0.01em';
    }

    const titleIndex = title ? [...headerRow.children].indexOf(title) : -1;
    const nameBox = titleIndex >= 0 ? headerRow.children[titleIndex + 1] : null;
    if (nameBox instanceof HTMLElement) {
      nameBox.style.fontFamily = 'var(--font-display), serif';
      nameBox.style.fontSize = '28px';
      nameBox.style.fontWeight = '600';
      nameBox.style.lineHeight = '1';
      nameBox.style.letterSpacing = '0.01em';
      nameBox.style.color = '#F4F0E7';
    }

    const toolbox = headerRow.parentElement;
    if (!(toolbox instanceof HTMLElement)) return;
    const aiRow = toolbox.children[1];
    if (!(aiRow instanceof HTMLElement)) return;

    [...aiRow.children].forEach((el) => {
      if (!(el instanceof HTMLButtonElement)) return;
      const active = typeof el.className === 'string' && el.className.includes('bg-[#d7b64d]');
      el.style.setProperty('border', `1px solid ${active ? ROYAL_BLUE_DARK : ROYAL_BLUE}`, 'important');
      el.style.setProperty('background', active ? LIGHT_BLUE_ACTIVE : LIGHT_BLUE, 'important');
      el.style.setProperty('color', TEXT_BLUE, 'important');
      el.style.setProperty('box-shadow', active ? 'inset 0 0 0 1px rgba(29,78,216,.20)' : 'none', 'important');
    });
  }

  applyRoomHeaderStyle();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyRoomHeaderStyle();
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();