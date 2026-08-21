(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  function findDock() {
    const bar = Array.from(document.querySelectorAll('div')).find((el) => {
      const cls = String(el.className || '');
      return cls.includes('fixed') && cls.includes('h-[92px]') && cls.includes('z-[170]');
    });
    if (!bar) return null;
    return Array.from(bar.children).find((child) => {
      const cls = String(child.className || '');
      return cls.includes('h-[50px]') && cls.includes('items-center');
    }) || null;
  }

  function moveLanguageBox() {
    const dock = findDock();
    const picker = document.querySelector('.rc-lang-picker');
    if (!(dock instanceof HTMLElement) || !(picker instanceof HTMLElement)) return;

    if (picker.parentElement !== dock || dock.lastElementChild !== picker) {
      dock.appendChild(picker);
    }

    picker.style.position = 'relative';
    picker.style.flex = '0 0 auto';
    picker.style.marginLeft = 'auto';
    picker.style.marginRight = '0';
    picker.style.alignSelf = 'center';
    picker.style.zIndex = '2147483646';

    const button = picker.querySelector('button');
    if (button instanceof HTMLButtonElement) {
      button.style.height = '30px';
      button.style.width = '170px';
    }

    const speaker = document.querySelector('[data-speaker-control="true"]');
    if (speaker instanceof HTMLButtonElement) {
      speaker.style.position = 'relative';
      speaker.style.top = '6px';
    }
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      moveLanguageBox();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
  schedule();
})();
