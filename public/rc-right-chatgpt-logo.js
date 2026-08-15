(() => {
  if (!location.pathname.startsWith('/rooms/')) return;
  const LOGO = '/rc-ai-logos/openai.svg';

  function apply() {
    const rightAside = [...document.querySelectorAll('aside')].find((el) =>
      el.querySelector('input[placeholder="앱, 파일, AI 찾기"]')
    );
    if (!(rightAside instanceof HTMLElement)) return;

    [...rightAside.querySelectorAll('button[title="ChatGPT"]')].forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      let img = button.querySelector('img');
      if (!(img instanceof HTMLImageElement)) {
        img = document.createElement('img');
        img.alt = 'ChatGPT logo';
        img.draggable = false;
        button.prepend(img);
      }
      img.src = LOGO;
      img.alt = 'ChatGPT logo';
      img.style.setProperty('display', 'block', 'important');
      img.style.setProperty('width', '20px', 'important');
      img.style.setProperty('height', '20px', 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
      img.style.setProperty('flex-shrink', '0', 'important');
      img.style.setProperty('filter', 'none', 'important');
      img.style.setProperty('opacity', '1', 'important');
    });
  }

  apply();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src','style','class'] });
})();