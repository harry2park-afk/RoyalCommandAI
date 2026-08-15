// restore 10-slot visual header safely
(() => {
  if (!location.pathname.startsWith('/rooms/')) return;
  const apply = () => {
    const header = document.querySelector('.royal-room-main main > div.fixed > div:nth-child(2)');
    if (!(header instanceof HTMLElement)) return;
    const buttons = Array.from(header.querySelectorAll(':scope > button'));
    const warehouse = buttons.find((b) => b.getAttribute('title')?.startsWith('AI Warehouse'));
    const aiButtons = buttons.filter((b) => b !== warehouse);
    aiButtons.forEach((b, i) => {
      const el = b;
      if (!(el instanceof HTMLElement)) return;
      el.style.display = i < 10 ? 'flex' : 'none';
      if (i < 10) {
        el.style.flex = '1 1 0%';
        el.style.minWidth = '0';
        el.style.height = '38px';
        el.style.fontFamily = 'Times New Roman, Times, serif';
        el.style.fontWeight = '300';
      }
    });
    if (warehouse instanceof HTMLElement) {
      warehouse.style.display = 'flex';
      warehouse.style.flex = '0 0 auto';
      warehouse.style.minWidth = '106px';
      warehouse.style.height = '38px';
      warehouse.style.fontFamily = 'Times New Roman, Times, serif';
      warehouse.style.fontWeight = '300';
    }
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();