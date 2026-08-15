(() => {
  if (!location.pathname.startsWith('/rooms/')) return;

  const LOGOS = {
    'ChatGPT': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/openai.svg',
    'Claude': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/anthropic.svg',
    'Gemini': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/googlegemini.svg',
    'Grok': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/x.svg',
    'DeepSeek': 'https://cdn.simpleicons.org/deepseek/FFFFFF',
    'Perplexity': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/perplexity.svg',
    'Mistral': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/mistralai.svg',
    'Meta Llama': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/meta.svg',
    'Qwen': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/alibabacloud.svg',
    'Cohere': 'https://cdn.simpleicons.org/cohere/FFFFFF',
    'Microsoft Phi': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/microsoft.svg',
    'Amazon Nova': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/amazonwebservices.svg',
    'NVIDIA Nemotron': 'https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/nvidia.svg'
  };

  const LABELS = {
    'ChatGPT': 'ChatGPT',
    'Claude': 'Claude AI',
    'Gemini': 'Gemini AI',
    'Grok': 'Grok AI',
    'DeepSeek': 'DeepSeek AI',
    'Perplexity': 'Perplexity AI',
    'Mistral': 'Mistral AI',
    'Meta Llama': 'Meta Llama',
    'Qwen': 'Qwen AI',
    'Cohere': 'Cohere AI',
    'Kimi / Moonshot AI': 'Kimi / Moonshot AI',
    'MiniMax': 'MiniMax AI',
    'Z.ai / GLM': 'Z.ai / GLM',
    'Microsoft Phi': 'Microsoft Phi',
    'Amazon Nova': 'Amazon Nova',
    'NVIDIA Nemotron': 'NVIDIA Nemotron',
    'AI21': 'AI21',
    'Nous Research': 'Nous Research',
    'Writer': 'Writer AI',
    'StepFun': 'StepFun',
    'Inception': 'Inception / Mercury',
    'Liquid AI': 'Liquid AI',
    'Arcee AI': 'Arcee AI',
    '01.AI / Yi': '01.AI / Yi',
    'Tencent Hunyuan': 'Tencent Hunyuan'
  };

  const FALLBACKS = {
    'ChatGPT':'GPT','Claude':'CL','Gemini':'GM','Grok':'GX','DeepSeek':'DS','Perplexity':'PX',
    'Mistral':'MI','Meta Llama':'ML','Qwen':'QW','Cohere':'CO','Kimi / Moonshot AI':'KM',
    'MiniMax':'MM','Z.ai / GLM':'GLM','Microsoft Phi':'PHI','Amazon Nova':'NV',
    'NVIDIA Nemotron':'NVD','AI21':'AI21','Nous Research':'NR','Writer':'WR','StepFun':'SF',
    'Inception':'MC','Liquid AI':'LQ','Arcee AI':'AR','01.AI / Yi':'YI','Tencent Hunyuan':'TH'
  };

  function findWarehouse() {
    const headings = [...document.querySelectorAll('div')].filter(el => el.textContent?.trim() === 'AI Warehouse');
    for (const heading of headings) {
      const panel = heading.closest('.fixed') || heading.parentElement?.parentElement?.parentElement;
      if (panel instanceof HTMLElement && panel.textContent?.includes('AI 검색')) return panel;
    }
    return null;
  }

  function getNameFromCard(card) {
    const textBlock = card.querySelector(':scope > span:last-child');
    if (!(textBlock instanceof HTMLElement)) return '';
    const nameEl = textBlock.querySelector(':scope > span:first-child');
    return nameEl?.textContent?.trim() || '';
  }

  function canonicalName(current) {
    const exact = Object.keys(LABELS).find(k => current === k || current === LABELS[k]);
    if (exact) return exact;
    const aliases = {
      'Llama':'Meta Llama','Kimi':'Kimi / Moonshot AI','GLM':'Z.ai / GLM','Phi':'Microsoft Phi',
      'Nova':'Amazon Nova','NVIDIA':'NVIDIA Nemotron','Nous':'Nous Research','Step':'StepFun',
      'Mercury':'Inception','Liquid':'Liquid AI','Arcee':'Arcee AI','Yi':'01.AI / Yi','Hunyuan':'Tencent Hunyuan'
    };
    return aliases[current] || current;
  }

  function styleCard(card) {
    if (!(card instanceof HTMLButtonElement)) return;
    const currentName = getNameFromCard(card);
    if (!currentName) return;
    const name = canonicalName(currentName);
    if (!LABELS[name]) return;

    card.dataset.rcWarehouseAi = name;
    card.style.setProperty('min-height', '70px', 'important');
    card.style.setProperty('gap', '10px', 'important');
    card.style.setProperty('padding', '10px', 'important');

    const logoBox = card.querySelector(':scope > span:first-child');
    if (logoBox instanceof HTMLElement) {
      logoBox.style.setProperty('width', '40px', 'important');
      logoBox.style.setProperty('height', '40px', 'important');
      logoBox.style.setProperty('min-width', '40px', 'important');
      logoBox.style.setProperty('background', 'rgba(0,0,0,.22)', 'important');
      logoBox.style.setProperty('border', '1px solid rgba(255,215,0,.22)', 'important');
      logoBox.style.setProperty('overflow', 'hidden', 'important');

      let img = logoBox.querySelector('img');
      if (!(img instanceof HTMLImageElement) && LOGOS[name]) {
        img = document.createElement('img');
        logoBox.prepend(img);
      }
      if (img instanceof HTMLImageElement) {
        if (LOGOS[name]) img.src = LOGOS[name];
        img.alt = `${LABELS[name]} logo`;
        img.style.setProperty('width', '28px', 'important');
        img.style.setProperty('height', '28px', 'important');
        img.style.setProperty('display', 'block', 'important');
        img.style.setProperty('object-fit', 'contain', 'important');
        img.style.setProperty('filter', name === 'DeepSeek' || name === 'Cohere' ? 'none' : 'brightness(0) invert(1)', 'important');
        img.onerror = () => {
          img.style.display = 'none';
          const fb = logoBox.querySelector('[data-rc-warehouse-fallback]');
          if (fb instanceof HTMLElement) fb.style.display = 'grid';
        };
      }

      let fallback = logoBox.querySelector('[data-rc-warehouse-fallback]');
      if (!(fallback instanceof HTMLElement)) {
        fallback = document.createElement('span');
        fallback.dataset.rcWarehouseFallback = '1';
        fallback.textContent = FALLBACKS[name] || name.slice(0, 2).toUpperCase();
        logoBox.appendChild(fallback);
      }
      fallback.style.setProperty('display', img instanceof HTMLImageElement && img.style.display !== 'none' ? 'none' : 'grid', 'important');
      fallback.style.setProperty('position', 'absolute', 'important');
      fallback.style.setProperty('inset', '0', 'important');
      fallback.style.setProperty('place-items', 'center', 'important');
      fallback.style.setProperty('font-family', '"Times New Roman", Times, serif', 'important');
      fallback.style.setProperty('font-size', '12px', 'important');
      fallback.style.setProperty('font-weight', '600', 'important');
      fallback.style.setProperty('color', '#FFD700', 'important');

      [...logoBox.querySelectorAll('span:not([data-rc-warehouse-fallback])')].forEach(el => {
        if (el instanceof HTMLElement) el.style.setProperty('display', 'none', 'important');
      });
    }

    const textBlock = card.querySelector(':scope > span:last-child');
    if (textBlock instanceof HTMLElement) {
      const nameEl = textBlock.querySelector(':scope > span:first-child');
      if (nameEl instanceof HTMLElement) {
        nameEl.textContent = LABELS[name];
        nameEl.style.setProperty('font-family', '"Times New Roman", Times, serif', 'important');
        nameEl.style.setProperty('font-size', '15px', 'important');
        nameEl.style.setProperty('font-weight', '300', 'important');
        nameEl.style.setProperty('letter-spacing', '-0.02em', 'important');
        nameEl.style.setProperty('white-space', 'normal', 'important');
        nameEl.style.setProperty('overflow', 'visible', 'important');
        nameEl.style.setProperty('text-overflow', 'clip', 'important');
        nameEl.style.setProperty('line-height', '1.05', 'important');
      }
      const statusEl = textBlock.querySelector(':scope > span:nth-child(2)');
      if (statusEl instanceof HTMLElement) {
        statusEl.style.setProperty('font-family', '"Times New Roman", Times, serif', 'important');
        statusEl.style.setProperty('font-size', '11px', 'important');
        statusEl.style.setProperty('font-weight', '300', 'important');
      }
    }
  }

  function applyWarehouseStyle() {
    const warehouse = findWarehouse();
    if (!(warehouse instanceof HTMLElement)) return;
    const search = warehouse.querySelector('input[placeholder="AI 검색..."]');
    if (!(search instanceof HTMLElement)) return;
    const grid = [...warehouse.querySelectorAll('div')].find(el =>
      el.className?.toString().includes('grid-cols-2') && el.querySelector('button')
    );
    if (!(grid instanceof HTMLElement)) return;
    [...grid.querySelectorAll(':scope > button')].forEach(styleCard);
  }

  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyWarehouseStyle();
    });
  }

  queue();
  new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
})();