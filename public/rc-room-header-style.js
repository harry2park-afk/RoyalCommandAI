(() => {
  if (!location.pathname.startsWith('/rooms/')) return;

  const ACTIVE = '#FACC15';
  const MUTED_BORDER = '#334155';
  const DARK = '#0F172A';
  const DEEP = '#090D16';
  const MUTED_TEXT = '#94A3B8';
  const REGIONS = ['US', 'EU', 'APAC', 'UK'];

  const AI_OFF_BG = '#1E3A8A';
  const AI_ON_BG = '#7A0C2E';
  const AI_GOLD = '#FFD700';
  const AI_ON_TEXT = '#FFF3D6';
  const VISIBLE_AI_COUNT = 10;

  const AI_LABELS = {
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
    'Kimi / Moonshot AI': 'Kimi Moonshot AI',
    'MiniMax': 'MiniMax AI',
    'Z.ai / GLM': 'Z.ai GLM',
    'Microsoft Phi': 'Microsoft Phi',
    'Amazon Nova': 'Amazon Nova',
  };

  const AI_LOGO_OVERRIDES = {
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
  };

  function makeStatusArea(headerRow) {
    let area = headerRow.querySelector('[data-rc-global-status]');
    if (area) return area;

    area = document.createElement('div');
    area.dataset.rcGlobalStatus = '1';
    area.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px';

    const status = document.createElement('span');
    status.dataset.rcLiveStatus = '1';
    status.textContent = 'Checking systems…';
    status.style.cssText = `font-size:10px;padding:5px 8px;border:1px solid ${MUTED_BORDER};border-radius:7px;color:${MUTED_TEXT};background:${DEEP}`;
    area.appendChild(status);

    const selectedRegion = localStorage.getItem('royalcommand:region') || 'APAC';
    REGIONS.forEach((region) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = region;
      button.dataset.rcRegion = region;
      button.onclick = () => {
        localStorage.setItem('royalcommand:region', region);
        styleRegions(area, region);
      };
      area.appendChild(button);
    });

    const controls = headerRow.lastElementChild;
    if (controls) headerRow.insertBefore(area, controls);
    else headerRow.appendChild(area);
    styleRegions(area, selectedRegion);
    return area;
  }

  function styleRegions(area, selected) {
    area.querySelectorAll('button[data-rc-region]').forEach((button) => {
      const on = button.dataset.rcRegion === selected;
      button.style.cssText = on
        ? `height:28px;padding:0 8px;border:2px solid ${ACTIVE};border-radius:7px;background:${DARK};color:${ACTIVE};font-size:10px;font-weight:700;box-shadow:0 0 10px rgba(250,204,21,.28);transition:.15s ease`
        : `height:28px;padding:0 8px;border:1px solid ${MUTED_BORDER};border-radius:7px;background:${DEEP};color:${MUTED_TEXT};font-size:10px;font-weight:600;opacity:.55;transition:.15s ease`;
    });
  }

  async function refreshStatus() {
    const status = document.querySelector('[data-rc-live-status]');
    if (!(status instanceof HTMLElement)) return;
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) throw new Error('unhealthy');
      status.textContent = '● All Systems Operational';
      status.style.color = '#86EFAC';
      status.style.borderColor = '#166534';
    } catch {
      status.textContent = '● System Check Required';
      status.style.color = '#FCA5A5';
      status.style.borderColor = '#7F1D1D';
    }
  }

  function ensureTwinkleStyle() {
    if (document.getElementById('rc-ai-twinkle-style')) return;
    const style = document.createElement('style');
    style.id = 'rc-ai-twinkle-style';
    style.textContent = `
      @keyframes rcAiTwinkle {
        0%,100% { opacity:.22; transform:scale(.65); }
        50% { opacity:1; transform:scale(1.35); }
      }
      @keyframes rcAiRespondingPulse {
        0%,100% { opacity:.35; transform:scale(.75); box-shadow:0 0 3px #FFFFFF; }
        50% { opacity:1; transform:scale(1.2); box-shadow:0 0 9px #FFD700; }
      }
      .rc-ai-star {
        position:absolute;
        z-index:5;
        border-radius:999px;
        pointer-events:none;
        animation:rcAiTwinkle 1.35s ease-in-out infinite;
        box-shadow:0 0 5px currentColor;
      }
      .rc-ai-response-indicator {
        position:absolute;
        z-index:8;
        right:5px;
        top:4px;
        width:6px;
        height:6px;
        border-radius:999px;
        background:#FFD700;
        border:1px solid #FFFFFF;
        pointer-events:none;
        animation:rcAiRespondingPulse .9s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  function addStars(button) {
    if (button.querySelector('[data-rc-ai-star]')) return;
    const positions = [
      [8,20,2.5,'#FFD700',0],
      [22,72,2,'#FFFFFF',.18],
      [39,32,2.3,'#FFD700',.42],
      [55,75,2.2,'#FFFFFF',.65],
      [70,19,2.4,'#FFD700',.28],
      [84,66,2,'#FFFFFF',.82],
      [93,30,2.3,'#FFD700',.5],
    ];
    positions.forEach(([left, top, size, color, delay]) => {
      const star = document.createElement('span');
      star.dataset.rcAiStar = '1';
      star.className = 'rc-ai-star';
      star.style.left = `${left}%`;
      star.style.top = `${top}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.background = color;
      star.style.color = color;
      star.style.animationDelay = `${delay}s`;
      button.appendChild(star);
    });
  }

  function removeStars(button) {
    button.querySelectorAll('[data-rc-ai-star]').forEach((star) => star.remove());
  }

  function isFixedBrandLogo(title) {
    return title === 'DeepSeek' || title === 'Cohere';
  }

  function setResponseIndicator(button, on) {
    const existing = button.querySelector('[data-rc-ai-response-indicator]');
    if (!on) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    const indicator = document.createElement('span');
    indicator.dataset.rcAiResponseIndicator = '1';
    indicator.className = 'rc-ai-response-indicator';
    indicator.title = 'Responding';
    button.appendChild(indicator);
  }

  function updateResponseIndicators(aiRow) {
    const working = [...document.querySelectorAll('.royal-room-main div')]
      .find((el) => el.textContent?.trim().startsWith('Working:'));
    const workingText = working?.textContent || '';

    [...aiRow.children].forEach((el) => {
      if (!(el instanceof HTMLButtonElement)) return;
      const fullTitle = (el.title || '').replace(/ — not connected$/, '');
      if (fullTitle === 'DeepSeek') setResponseIndicator(el, workingText.includes('DeepSeek'));
      if (fullTitle === 'Cohere') setResponseIndicator(el, workingText.includes('Cohere'));
    });
  }

  function enhanceAiButtonContent(button) {
    const fullTitle = (button.title || '').replace(/ — not connected$/, '');
    if (!fullTitle || fullTitle.startsWith('AI Warehouse')) return;

    const logoBox = button.querySelector('span');
    if (logoBox instanceof HTMLElement) {
      logoBox.style.setProperty('width', '24px', 'important');
      logoBox.style.setProperty('height', '24px', 'important');
      logoBox.style.setProperty('min-width', '24px', 'important');
      logoBox.style.setProperty('background', 'rgba(0,0,0,.18)', 'important');

      let img = logoBox.querySelector('img');
      if (!(img instanceof HTMLImageElement) && AI_LOGO_OVERRIDES[fullTitle]) {
        img = document.createElement('img');
        img.alt = `${fullTitle} logo`;
        logoBox.prepend(img);
      }

      if (img instanceof HTMLImageElement) {
        if (AI_LOGO_OVERRIDES[fullTitle]) img.src = AI_LOGO_OVERRIDES[fullTitle];
        img.alt = `${fullTitle} logo`;
        img.style.setProperty('display', 'block', 'important');
        img.style.setProperty('width', '19px', 'important');
        img.style.setProperty('height', '19px', 'important');
        img.style.setProperty('object-fit', 'contain', 'important');
        img.style.setProperty('filter', isFixedBrandLogo(fullTitle) ? 'none' : 'brightness(0) invert(1)', 'important');
        img.onerror = () => {
          img.style.display = 'none';
          const fallback = logoBox.querySelector('[data-rc-brand-fallback]');
          if (fallback instanceof HTMLElement) fallback.style.display = 'block';
        };
      }

      let fallback = logoBox.querySelector('[data-rc-brand-fallback]');
      if (!(fallback instanceof HTMLElement)) {
        fallback = document.createElement('span');
        fallback.dataset.rcBrandFallback = '1';
        fallback.textContent = fullTitle === 'DeepSeek' ? 'DS' : fullTitle === 'Cohere' ? 'CO' : fullTitle.slice(0, 1);
        logoBox.appendChild(fallback);
      }
      fallback.style.setProperty('display', img instanceof HTMLImageElement ? 'none' : 'block', 'important');
      fallback.style.setProperty('font-family', '"Times New Roman", Times, serif', 'important');
      fallback.style.setProperty('font-size', '10px', 'important');
      fallback.style.setProperty('font-weight', '700', 'important');
      fallback.style.setProperty('color', '#FFFFFF', 'important');

      [...logoBox.querySelectorAll('span:not([data-rc-brand-fallback])')].forEach((oldFallback) => {
        if (oldFallback instanceof HTMLElement) oldFallback.style.setProperty('display', 'none', 'important');
      });
    }

    const label = button.querySelector(':scope > span:last-child');
    if (label instanceof HTMLElement) {
      label.textContent = AI_LABELS[fullTitle] || fullTitle;
      label.style.setProperty('font-family', '"Times New Roman", Times, serif', 'important');
      label.style.setProperty('font-size', '13px', 'important');
      label.style.setProperty('font-weight', '300', 'important');
      label.style.setProperty('letter-spacing', '-0.03em', 'important');
      label.style.setProperty('line-height', '1', 'important');
      label.style.setProperty('transform', 'scaleX(.80)', 'important');
      label.style.setProperty('transform-origin', 'center', 'important');
      label.style.setProperty('overflow', 'visible', 'important');
      label.style.setProperty('text-overflow', 'clip', 'important');
      label.style.setProperty('white-space', 'nowrap', 'important');
    }
  }

  function styleAiButton(button) {
    if (button.title?.startsWith('AI Warehouse')) return;
    if (button.dataset.rcRegion) return;

    const fullTitle = (button.title || '').replace(/ — not connected$/, '');
    const active = typeof button.className === 'string' && button.className.includes('bg-[#d7b64d]');
    button.style.setProperty('position', 'relative', 'important');
    button.style.setProperty('overflow', 'hidden', 'important');
    button.style.setProperty('height', '31px', 'important');
    button.style.setProperty('gap', '3px', 'important');
    button.style.setProperty('padding-left', '4px', 'important');
    button.style.setProperty('padding-right', '4px', 'important');
    button.style.setProperty('border', `3px solid ${AI_GOLD}`, 'important');
    button.style.setProperty('border-radius', '7px', 'important');
    button.style.setProperty('background', active ? AI_ON_BG : AI_OFF_BG, 'important');
    button.style.setProperty('color', active ? AI_ON_TEXT : AI_GOLD, 'important');
    button.style.setProperty('opacity', button.disabled ? '.35' : '1', 'important');
    button.style.setProperty('box-shadow', active ? '0 0 10px rgba(255,215,0,.55), inset 0 0 12px rgba(255,255,255,.06)' : 'inset 0 0 0 1px rgba(255,255,255,.05)', 'important');
    button.style.setProperty('transition', 'background .18s ease,color .18s ease,box-shadow .18s ease', 'important');

    enhanceAiButtonContent(button);
    if (isFixedBrandLogo(fullTitle)) {
      removeStars(button);
    } else if (active) {
      addStars(button);
    } else {
      removeStars(button);
    }
  }

  function styleAiRow(aiRow) {
    const buttons = [...aiRow.children].filter((el) => el instanceof HTMLButtonElement);
    const aiButtons = buttons.filter((button) => !button.title?.startsWith('AI Warehouse'));
    const warehouse = buttons.find((button) => button.title?.startsWith('AI Warehouse'));

    aiButtons.forEach((button, index) => {
      if (index < VISIBLE_AI_COUNT) {
        button.style.setProperty('display', 'flex', 'important');
        button.style.setProperty('flex', '1 1 0%', 'important');
        button.style.setProperty('min-width', '0', 'important');
        styleAiButton(button);
      } else {
        button.style.setProperty('display', 'none', 'important');
      }
    });

    if (warehouse instanceof HTMLButtonElement) {
      warehouse.style.setProperty('display', 'flex', 'important');
      warehouse.style.setProperty('height', '31px', 'important');
      warehouse.style.setProperty('min-width', '126px', 'important');
      warehouse.style.setProperty('flex', '0 0 126px', 'important');
      warehouse.style.setProperty('font-family', '"Times New Roman", Times, serif', 'important');
      warehouse.style.setProperty('font-weight', '300', 'important');
      warehouse.style.setProperty('font-size', '13px', 'important');
      warehouse.style.setProperty('letter-spacing', '-0.03em', 'important');
      const label = warehouse.querySelector('span:last-child');
      if (label instanceof HTMLElement) {
        label.textContent = 'AI Warehouse';
        label.style.setProperty('font-family', '"Times New Roman", Times, serif', 'important');
        label.style.setProperty('font-weight', '300', 'important');
        label.style.setProperty('font-size', '13px', 'important');
        label.style.setProperty('transform', 'scaleX(.80)', 'important');
        label.style.setProperty('transform-origin', 'center', 'important');
        label.style.setProperty('white-space', 'nowrap', 'important');
      }
    }

    updateResponseIndicators(aiRow);
  }

  function applyRoomHeaderStyle() {
    const dashboard = document.querySelector('a[href="/dashboard"]');
    if (!(dashboard instanceof HTMLElement)) return;
    const headerRow = dashboard.parentElement;
    if (!(headerRow instanceof HTMLElement)) return;

    ensureTwinkleStyle();
    headerRow.style.background = DEEP;
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
      nameBox.style.color = '#F8FAFC';
    }

    if (!headerRow.querySelector('[data-rc-brand]')) {
      const brand = document.createElement('span');
      brand.dataset.rcBrand = '1';
      brand.innerHTML = '<strong>♛ Royal Command</strong><small> Global Enterprise AI</small>';
      brand.style.cssText = 'display:flex;align-items:baseline;gap:6px;color:#F8FAFC;white-space:nowrap;font-size:12px';
      const small = brand.querySelector('small');
      if (small) small.style.cssText = `font-size:9px;color:${MUTED_TEXT};letter-spacing:.08em`;
      dashboard.insertAdjacentElement('afterend', brand);
    }

    const toolbox = headerRow.parentElement;
    if (!(toolbox instanceof HTMLElement)) return;
    toolbox.style.background = DEEP;
    const aiRow = toolbox.children[1];
    if (aiRow instanceof HTMLElement) styleAiRow(aiRow);

    makeStatusArea(headerRow);
    void refreshStatus();
  }

  applyRoomHeaderStyle();
  setInterval(refreshStatus, 30000);
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