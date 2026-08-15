(() => {
  if (!location.pathname.startsWith('/rooms/')) return;

  const LOCAL = {
    'Cohere': '/brand-logos/cohere.svg',
    'DeepSeek': '/brand-logos/deepseek.svg',
  };

  function applyTopRow() {
    document.querySelectorAll('button[title]').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const name = (button.title || '').replace(/ — not connected$/, '');
      const src = LOCAL[name];
      if (!src) return;
      const logoBox = button.querySelector(':scope > span:first-child');
      if (!(logoBox instanceof HTMLElement)) return;
      let img = logoBox.querySelector('img');
      if (!(img instanceof HTMLImageElement)) {
        img = document.createElement('img');
        logoBox.prepend(img);
      }
      img.src = src;
      img.alt = `${name} logo`;
      img.draggable = false;
      img.style.setProperty('display','block','important');
      img.style.setProperty('width','20px','important');
      img.style.setProperty('height','20px','important');
      img.style.setProperty('object-fit','contain','important');
      img.style.setProperty('filter','none','important');
      img.style.setProperty('animation','none','important');
      img.style.setProperty('transform','none','important');
      logoBox.querySelectorAll('span').forEach((el) => {
        if (el instanceof HTMLElement) el.style.setProperty('display','none','important');
      });
    });
  }

  function applyWarehouse() {
    document.querySelectorAll('[data-rc-warehouse-ai]').forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      const name = card.dataset.rcWarehouseAi || '';
      const src = LOCAL[name];
      if (!src) return;
      const logoBox = card.querySelector(':scope > span:first-child');
      if (!(logoBox instanceof HTMLElement)) return;
      let img = logoBox.querySelector('img');
      if (!(img instanceof HTMLImageElement)) {
        img = document.createElement('img');
        logoBox.prepend(img);
      }
      img.src = src;
      img.alt = `${name} logo`;
      img.draggable = false;
      img.style.setProperty('display','block','important');
      img.style.setProperty('width','28px','important');
      img.style.setProperty('height','28px','important');
      img.style.setProperty('object-fit','contain','important');
      img.style.setProperty('filter','none','important');
      img.style.setProperty('animation','none','important');
      img.style.setProperty('transform','none','important');
      logoBox.querySelectorAll('span').forEach((el) => {
        if (el instanceof HTMLElement) el.style.setProperty('display','none','important');
      });
    });
  }

  function apply() {
    applyTopRow();
    applyWarehouse();
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
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','style','class']});
})();