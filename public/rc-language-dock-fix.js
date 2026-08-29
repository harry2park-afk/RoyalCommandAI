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
  }

  function findConnectButton() {
    return Array.from(document.querySelectorAll('button')).find((item) => {
      if (!(item instanceof HTMLButtonElement)) return false;
      return item.style.position === 'fixed'
        && item.style.right === '184px'
        && item.style.zIndex === '355';
    }) || null;
  }

  function findWarehouseButton() {
    return Array.from(document.querySelectorAll('button')).find((item) => {
      if (!(item instanceof HTMLButtonElement)) return false;
      return (item.title || '').startsWith('AI Warehouse');
    }) || null;
  }

  function matchConnectToWarehouse() {
    const connect = findConnectButton();
    const warehouse = findWarehouseButton();
    if (!(connect instanceof HTMLButtonElement) || !(warehouse instanceof HTMLButtonElement)) return;

    const warehouseStyle = window.getComputedStyle(warehouse);
    const warehouseRect = warehouse.getBoundingClientRect();

    // Copy only the AI Warehouse box geometry/typography onto Connect.
    // Keep Connect's own click handler, label, colours and connector logic untouched.
    connect.style.boxSizing = warehouseStyle.boxSizing;
    connect.style.height = `${warehouseRect.height}px`;
    connect.style.width = `${warehouseRect.width}px`;
    connect.style.minWidth = `${warehouseRect.width}px`;
    connect.style.maxWidth = `${warehouseRect.width}px`;
    connect.style.paddingTop = warehouseStyle.paddingTop;
    connect.style.paddingRight = warehouseStyle.paddingRight;
    connect.style.paddingBottom = warehouseStyle.paddingBottom;
    connect.style.paddingLeft = warehouseStyle.paddingLeft;
    connect.style.borderRadius = warehouseStyle.borderRadius;
    connect.style.fontSize = warehouseStyle.fontSize;
    connect.style.fontWeight = warehouseStyle.fontWeight;
    connect.style.lineHeight = warehouseStyle.lineHeight;
    connect.style.gap = warehouseStyle.gap;
    connect.style.alignItems = warehouseStyle.alignItems;
    connect.style.justifyContent = warehouseStyle.justifyContent;
    connect.style.top = `${Math.round(warehouseRect.top)}px`;
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      moveLanguageBox();
      matchConnectToWarehouse();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
  schedule();
})();
