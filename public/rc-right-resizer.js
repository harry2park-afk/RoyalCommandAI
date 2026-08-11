(() => {
  const HANDLE_ID = 'rc-right-resize-handle';
  let dragging = false;
  let section = null;
  let startLeft = 0;

  function getSection() {
    const t = document.querySelector('textarea[placeholder*="Royal Command"]');
    return t instanceof HTMLTextAreaElement ? t.closest('section') : null;
  }

  function placeHandle() {
    section = getSection();
    const handle = document.getElementById(HANDLE_ID);
    if (!(section instanceof HTMLElement) || !(handle instanceof HTMLElement)) return;
    const r = section.getBoundingClientRect();
    handle.style.left = `${Math.max(0, r.right - 7)}px`;
  }

  function ensureHandle() {
    let handle = document.getElementById(HANDLE_ID);
    if (handle instanceof HTMLDivElement) {
      placeHandle();
      return;
    }

    handle = document.createElement('div');
    handle.id = HANDLE_ID;
    handle.title = 'Drag left or right to resize';
    handle.innerHTML = '<span></span><span></span><span></span>';
    handle.style.cssText = [
      'position:fixed',
      'top:50%',
      'transform:translate(-50%,-50%)',
      'z-index:2147483639',
      'width:18px',
      'height:46px',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:4px',
      'cursor:col-resize',
      'user-select:none',
      'touch-action:none'
    ].join(';');
    handle.querySelectorAll('span').forEach((dot) => {
      dot.style.cssText = 'display:block;width:3px;height:3px;border-radius:999px;background:rgba(240,215,140,.9);box-shadow:0 0 0 1px rgba(0,0,0,.35)';
    });

    handle.addEventListener('pointerdown', (e) => {
      section = getSection();
      if (!(section instanceof HTMLElement)) return;
      dragging = true;
      const r = section.getBoundingClientRect();
      startLeft = r.left;
      handle.setPointerCapture?.(e.pointerId);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging || !(section instanceof HTMLElement)) return;
      const minWidth = Math.max(520, window.innerWidth * 0.42);
      const maxRight = window.innerWidth - 6;
      const right = Math.min(maxRight, Math.max(startLeft + minWidth, e.clientX));
      const width = right - startLeft;
      section.style.setProperty('width', `${width}px`, 'important');
      section.style.setProperty('max-width', 'none', 'important');
      section.style.setProperty('min-width', '0', 'important');
      const form = section.querySelector('form');
      if (form instanceof HTMLElement) {
        form.style.setProperty('width', '100%', 'important');
        form.style.setProperty('max-width', 'none', 'important');
      }
      const textarea = section.querySelector('textarea[placeholder*="Royal Command"]');
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.style.setProperty('width', '100%', 'important');
        textarea.style.setProperty('max-width', 'none', 'important');
      }
      handle.style.left = `${right - 7}px`;
    });

    const stop = (e) => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture?.(e.pointerId); } catch {}
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      placeHandle();
    };
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);

    document.body.appendChild(handle);
    placeHandle();
  }

  function init() {
    ensureHandle();
    placeHandle();
  }

  init();
  window.addEventListener('resize', placeHandle);
  new MutationObserver(() => requestAnimationFrame(init)).observe(document.documentElement, { childList: true, subtree: true });
})();