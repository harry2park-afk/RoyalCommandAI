(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  let connectorCatalog = null;
  let catalogPromise = null;

  function loadConnectorCatalog() {
    if (connectorCatalog) return Promise.resolve(connectorCatalog);
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch('/rc-connector-catalog.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Connector catalog unavailable');
        return response.json();
      })
      .then((data) => {
        connectorCatalog = data && typeof data === 'object' ? data : null;
        return connectorCatalog;
      })
      .catch(() => null);
    return catalogPromise;
  }

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

  function getLocale() {
    try {
      return localStorage.getItem('royalcommand:selected-language') || document.documentElement.lang || 'en';
    } catch {
      return document.documentElement.lang || 'en';
    }
  }

  function t(en, ko) {
    return getLocale().toLowerCase().startsWith('ko') ? ko : en;
  }

  function getConnectDialogParts() {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
    const dialog = dialogs.find((item) => {
      const label = String(item.getAttribute('aria-label') || '').toLowerCase();
      return label.includes('connect') || label.includes('연결') || label.includes('连接') || label.includes('連接') || label.includes('اتصال');
    });
    if (!(dialog instanceof HTMLElement)) return null;
    const panel = dialog.firstElementChild;
    if (!(panel instanceof HTMLElement) || panel.children.length < 4) return null;
    const controls = panel.children[1];
    const list = panel.children[2];
    const footer = panel.children[panel.children.length - 1];
    if (!(controls instanceof HTMLElement) || !(list instanceof HTMLElement) || !(footer instanceof HTMLElement)) return null;
    return { dialog, panel, controls, list, footer };
  }

  function currentCategory(parts) {
    const saved = parts.panel.dataset.rcCatalogCategory;
    if (saved === 'ai' || saved === 'tools' || saved === 'services') return saved;
    return 'ai';
  }

  function wireCategoryButtons(parts) {
    const topRow = parts.controls.firstElementChild;
    if (!(topRow instanceof HTMLElement)) return;
    const buttons = Array.from(topRow.querySelectorAll('button')).slice(0, 3);
    const categories = ['ai', 'tools', 'services'];
    buttons.forEach((button, index) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.rcCatalogWired === '1') return;
      button.dataset.rcCatalogWired = '1';
      button.addEventListener('click', () => {
        parts.panel.dataset.rcCatalogCategory = categories[index];
        requestAnimationFrame(schedule);
      });
    });
  }

  function existingRowNames(list) {
    return Array.from(list.children)
      .filter((el) => el instanceof HTMLElement && el.dataset.rcCatalogExtra !== '1')
      .map((el) => String(el.textContent || '').trim().toLowerCase())
      .filter(Boolean);
  }

  function makeCatalogRow(name, category) {
    const row = document.createElement('div');
    row.dataset.rcCatalogExtra = '1';
    Object.assign(row.style, {
      display: 'grid',
      gridTemplateColumns: '180px 1fr 170px 120px',
      gap: '12px',
      alignItems: 'center',
      minHeight: '68px',
      borderBottom: '1px solid rgba(255,255,255,.1)'
    });

    const title = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = name;
    title.appendChild(strong);

    const summary = document.createElement('div');
    summary.style.fontSize = '12px';
    summary.style.color = '#c7d1dc';
    summary.style.lineHeight = '1.4';
    summary.textContent = category === 'ai'
      ? t('AI available in the Royal Command catalog. Provider connection is being prepared.', 'Royal Command AI 카탈로그 항목입니다. 공급자 연결을 준비 중입니다.')
      : category === 'tools'
        ? t('Popular app or tool. Connection may require provider approval or account setup.', '자주 사용하는 앱/도구입니다. 공급자 승인 또는 계정 설정이 필요할 수 있습니다.')
        : t('Popular service. Royal Command may need provider or contract review before activation.', '자주 사용하는 서비스입니다. 활성화 전에 공급자 또는 계약 검토가 필요할 수 있습니다.');

    const price = document.createElement('div');
    price.style.textAlign = 'center';
    price.style.fontWeight = '900';
    price.style.color = '#aeb8c6';
    price.textContent = t('Price pending', '가격 확인');

    const status = document.createElement('div');
    status.style.textAlign = 'center';
    status.style.color = '#aeb8c6';
    status.style.fontWeight = '850';
    status.textContent = t('Request Connection', '연결 요청');

    row.append(title, summary, price, status);
    return row;
  }

  function fillFeaturedRows(parts) {
    if (!connectorCatalog) return;
    const category = currentCategory(parts);
    const names = Array.isArray(connectorCatalog[category]) ? connectorCatalog[category].slice(0, 30) : [];
    const existing = existingRowNames(parts.list);
    const actualRowCount = Array.from(parts.list.children).filter((el) => {
      if (!(el instanceof HTMLElement) || el.dataset.rcCatalogExtra === '1') return false;
      return Boolean(el.style.gridTemplateColumns);
    }).length;
    let remaining = Math.max(0, 30 - actualRowCount);
    const desired = [];

    for (const name of names) {
      if (remaining <= 0) break;
      const lower = name.toLowerCase();
      if (existing.some((text) => text.includes(lower))) continue;
      desired.push(name);
      remaining -= 1;
    }

    const current = Array.from(parts.list.querySelectorAll('[data-rc-catalog-extra="1"]'))
      .map((node) => String(node.querySelector('strong')?.textContent || ''));
    if (current.length === desired.length && current.every((name, index) => name === desired[index])) return;

    Array.from(parts.list.querySelectorAll('[data-rc-catalog-extra="1"]')).forEach((node) => node.remove());
    desired.forEach((name) => parts.list.appendChild(makeCatalogRow(name, category)));
  }

  function allCatalogItems() {
    if (!connectorCatalog) return [];
    return ['ai', 'tools', 'services'].flatMap((category) => {
      const values = Array.isArray(connectorCatalog[category]) ? connectorCatalog[category] : [];
      return values.map((name, index) => ({ category, name, featured: index < 30 }));
    });
  }

  function categoryLabel(category) {
    if (category === 'ai') return 'AI';
    if (category === 'tools') return 'Apps & Tools';
    return 'Services';
  }

  function renderFindResults(container, query) {
    const results = container.querySelector('[data-rc-find-results="1"]');
    if (!(results instanceof HTMLElement)) return;
    const q = query.trim().toLowerCase();
    results.replaceChildren();
    if (!q) {
      results.style.display = 'none';
      return;
    }

    const matches = allCatalogItems().filter((item) => `${item.name} ${categoryLabel(item.category)}`.toLowerCase().includes(q)).slice(0, 12);
    results.style.display = 'block';

    if (!matches.length) {
      const empty = document.createElement('div');
      empty.style.padding = '10px 12px';
      empty.style.color = '#b8c1cf';
      empty.textContent = t('No catalog match. Royal Command can review a custom connection request.', '카탈로그에 없습니다. Royal Command에서 맞춤 연결 요청을 검토할 수 있습니다.');
      results.appendChild(empty);
      return;
    }

    matches.forEach((item) => {
      const line = document.createElement('div');
      Object.assign(line.style, {
        display: 'grid',
        gridTemplateColumns: '110px 1fr 150px',
        gap: '10px',
        alignItems: 'center',
        padding: '9px 10px',
        borderTop: '1px solid rgba(255,255,255,.08)'
      });
      const type = document.createElement('div');
      type.style.color = '#f6d76b';
      type.style.fontSize = '11px';
      type.style.fontWeight = '850';
      type.textContent = categoryLabel(item.category);
      const name = document.createElement('div');
      name.style.fontWeight = '800';
      name.textContent = item.name;
      const status = document.createElement('div');
      status.style.textAlign = 'right';
      status.style.color = item.featured ? '#c9d4df' : '#9aa6b5';
      status.style.fontSize = '11px';
      status.style.fontWeight = '800';
      status.textContent = item.featured ? t('Request Connection', '연결 요청') : t('Coming soon', '준비 중');
      line.append(type, name, status);
      results.appendChild(line);
    });
  }

  function startVoiceSearch(input, resultsContainer) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      input.placeholder = t('Voice search is not supported in this browser', '이 브라우저는 음성 검색을 지원하지 않습니다');
      input.focus();
      return;
    }
    const recognition = new SR();
    recognition.lang = getLocale().toLowerCase().startsWith('ko') ? 'ko-KR' : 'en-AU';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results && event.results[0] && event.results[0][0] ? event.results[0][0].transcript : '';
      input.value = transcript;
      renderFindResults(resultsContainer, transcript);
    };
    recognition.start();
  }

  function ensureFindMore(parts) {
    let box = parts.panel.querySelector('[data-rc-find-more="1"]');
    if (box instanceof HTMLElement) return box;

    box = document.createElement('div');
    box.dataset.rcFindMore = '1';
    Object.assign(box.style, {
      borderTop: '1px solid rgba(214,173,49,.35)',
      background: '#091421',
      padding: '10px 14px'
    });

    const title = document.createElement('div');
    title.style.fontSize = '12px';
    title.style.fontWeight = '900';
    title.style.color = '#f6d76b';
    title.style.marginBottom = '7px';
    title.textContent = t('Find More — search all AI, Apps & Tools and Services', 'Find More — AI, 앱·도구, 서비스를 모두 검색');

    const searchLine = document.createElement('div');
    Object.assign(searchLine.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 44px',
      gap: '8px'
    });

    const inputWrap = document.createElement('div');
    Object.assign(inputWrap.style, {
      display: 'flex',
      alignItems: 'center',
      minHeight: '44px',
      border: '1px solid #596779',
      borderRadius: '9px',
      background: '#0c1624',
      padding: '0 12px'
    });

    const searchIcon = document.createElement('span');
    searchIcon.textContent = '⌕';
    searchIcon.style.fontSize = '20px';
    searchIcon.style.marginRight = '8px';
    searchIcon.style.color = '#d7b64d';

    const input = document.createElement('input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.placeholder = t('Type anything you want to connect…', '연결하고 싶은 AI·앱·서비스를 입력하세요…');
    Object.assign(input.style, {
      width: '100%',
      height: '42px',
      border: '0',
      outline: '0',
      background: 'transparent',
      color: '#fff',
      fontSize: '14px'
    });

    inputWrap.append(searchIcon, input);

    const mic = document.createElement('button');
    mic.type = 'button';
    mic.title = t('Voice search', '음성 검색');
    mic.textContent = '🎤';
    Object.assign(mic.style, {
      height: '44px',
      border: '1px solid #d6ad31',
      borderRadius: '9px',
      background: '#173b68',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '17px'
    });

    const results = document.createElement('div');
    results.dataset.rcFindResults = '1';
    Object.assign(results.style, {
      display: 'none',
      maxHeight: '190px',
      overflowY: 'auto',
      marginTop: '8px',
      border: '1px solid rgba(255,255,255,.1)',
      borderRadius: '8px',
      background: '#07111f'
    });

    searchLine.append(inputWrap, mic);
    box.append(title, searchLine, results);
    parts.panel.insertBefore(box, parts.footer);

    input.addEventListener('input', () => renderFindResults(box, input.value));
    mic.addEventListener('click', () => startVoiceSearch(input, box));
    return box;
  }

  function enhanceConnectDialog() {
    const parts = getConnectDialogParts();
    if (!parts) return;
    wireCategoryButtons(parts);
    void loadConnectorCatalog().then((catalog) => {
      if (!catalog) return;
      const latest = getConnectDialogParts();
      if (!latest) return;
      ensureFindMore(latest);
      fillFeaturedRows(latest);
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      moveLanguageBox();
      matchConnectToWarehouse();
      enhanceConnectDialog();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('royalcommand:language-changed', schedule);
  schedule();
})();
