(() => {
  const LANGS = [
    ["ko-KR","KR","kr","한국어"],["en-AU","AU","au","English (Australia)"],["en-US","US","us","English (United States)"],["en-GB","UK","gb","English (United Kingdom)"],["en-CA","CA","ca","English (Canada)"],["en-NZ","NZ","nz","English (New Zealand)"],["ja-JP","JP","jp","日本語"],["zh-CN","CN","cn","中文 (简体)"],["zh-TW","TW","tw","中文 (繁體)"],["es-ES","ES","es","Español"],["es-MX","MX","mx","Español (México)"],["es-AR","AR","ar","Español (Argentina)"],["fr-FR","FR","fr","Français"],["fr-CA","CA","ca","Français (Canada)"],["de-DE","DE","de","Deutsch"],["it-IT","IT","it","Italiano"],["pt-BR","BR","br","Português (Brasil)"],["pt-PT","PT","pt","Português (Portugal)"],["nl-NL","NL","nl","Nederlands"],["nl-BE","BE","be","Nederlands (België)"],["ru-RU","RU","ru","Русский"],["uk-UA","UA","ua","Українська"],["pl-PL","PL","pl","Polski"],["cs-CZ","CZ","cz","Čeština"],["sk-SK","SK","sk","Slovenčina"],["hu-HU","HU","hu","Magyar"],["ro-RO","RO","ro","Română"],["bg-BG","BG","bg","Български"],["sr-RS","RS","rs","Српски"],["hr-HR","HR","hr","Hrvatski"],["sl-SI","SI","si","Slovenščina"],["bs-BA","BA","ba","Bosanski"],["mk-MK","MK","mk","Македонски"],["el-GR","GR","gr","Ελληνικά"],["tr-TR","TR","tr","Türkçe"],["ar-SA","SA","sa","العربية"],["ar-AE","AE","ae","العربية (الإمارات)"],["he-IL","IL","il","עברית"],["fa-IR","IR","ir","فارسی"],["ur-PK","PK","pk","اردو"],["hi-IN","IN","in","हिन्दी"],["bn-BD","BD","bd","বাংলা"],["pa-IN","IN","in","ਪੰਜਾਬੀ"],["gu-IN","IN","in","ગુજરાતી"],["mr-IN","IN","in","मराठी"],["ta-IN","IN","in","தமிழ்"],["te-IN","IN","in","తెలుగు"],["kn-IN","IN","in","ಕನ್ನಡ"],["ml-IN","IN","in","മലയാളം"],["ne-NP","NP","np","नेपाली"],["si-LK","LK","lk","සිංහල"],["th-TH","TH","th","ไทย"],["vi-VN","VN","vn","Tiếng Việt"],["id-ID","ID","id","Bahasa Indonesia"],["ms-MY","MY","my","Bahasa Melayu"],["fil-PH","PH","ph","Filipino"],["km-KH","KH","kh","ខ្មែរ"],["lo-LA","LA","la","ລາວ"],["my-MM","MM","mm","မြန်မာ"],["mn-MN","MN","mn","Монгол"],["kk-KZ","KZ","kz","Қазақша"],["uz-UZ","UZ","uz","Oʻzbekcha"],["az-AZ","AZ","az","Azərbaycan"],["ka-GE","GE","ge","ქართული"],["hy-AM","AM","am","Հայերեն"],["sw-KE","KE","ke","Kiswahili"],["am-ET","ET","et","አማርኛ"],["af-ZA","ZA","za","Afrikaans"],["zu-ZA","ZA","za","isiZulu"],["xh-ZA","ZA","za","isiXhosa"],["ha-NG","NG","ng","Hausa"],["yo-NG","NG","ng","Yorùbá"],["ig-NG","NG","ng","Igbo"],["so-SO","SO","so","Soomaali"],["sq-AL","AL","al","Shqip"],["et-EE","EE","ee","Eesti"],["lv-LV","LV","lv","Latviešu"],["lt-LT","LT","lt","Lietuvių"],["fi-FI","FI","fi","Suomi"],["sv-SE","SE","se","Svenska"],["no-NO","NO","no","Norsk"],["da-DK","DK","dk","Dansk"],["is-IS","IS","is","Íslenska"],["ca-ES","ES","es","Català"],["eu-ES","ES","es","Euskara"],["gl-ES","ES","es","Galego"],["cy-GB","UK","gb","Cymraeg"],["ga-IE","IE","ie","Gaeilge"],["mt-MT","MT","mt","Malti"],["lb-LU","LU","lu","Lëtzebuergesch"],["be-BY","BY","by","Беларуская"],["ps-AF","AF","af","پښتو"],["sd-PK","PK","pk","سنڌي"],["jv-ID","ID","id","Basa Jawa"],["su-ID","ID","id","Basa Sunda"],["ceb-PH","PH","ph","Cebuano"],["mg-MG","MG","mg","Malagasy"],["mi-NZ","NZ","nz","Māori"],["sm-WS","WS","ws","Gagana Samoa"],["ht-HT","HT","ht","Kreyòl Ayisyen"],["eo-EO","UN","un","Esperanto"]
  ];

  const byValue = new Map(LANGS.map((x) => [x[0], x]));
  const flagUrl = (cc) => `https://flagcdn.com/w40/${cc}.png`;

  function setReactSelect(select, value) {
    if (![...select.options].some((o) => o.value === value)) {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = value;
      select.appendChild(o);
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(select, value);
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function enhance(select) {
    if (select.dataset.rcLangEnhanced === "1") return;
    select.dataset.rcLangEnhanced = "1";
    select.style.position = "absolute";
    select.style.opacity = "0";
    select.style.pointerEvents = "none";
    select.style.width = "1px";
    select.style.height = "1px";

    const wrap = document.createElement("div");
    wrap.className = "rc-lang-picker";
    wrap.style.cssText = "position:relative;flex:0 0 auto;margin-left:auto;z-index:60";

    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText = "height:32px;min-width:112px;display:flex;align-items:center;justify-content:space-between;gap:7px;padding:0 9px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font-size:12px;cursor:pointer";

    const menu = document.createElement("div");
    menu.style.cssText = "display:none;position:absolute;right:0;top:38px;width:290px;max-height:430px;overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:#0b1220;box-shadow:0 18px 50px rgba(0,0,0,.55);z-index:9999";

    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search country or language…";
    search.style.cssText = "display:block;width:calc(100% - 16px);margin:8px;padding:8px 10px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:#070b14;color:#fff;font-size:12px;outline:none";

    const list = document.createElement("div");
    list.style.cssText = "max-height:375px;overflow-y:auto;padding:0 6px 7px";

    let current = byValue.get(select.value) || byValue.get(select.value === "ko" ? "ko-KR" : select.value === "en" ? "en-AU" : `${select.value}-${select.value.toUpperCase()}`) || LANGS[0];

    function renderButton() {
      button.innerHTML = `<span style="display:flex;align-items:center;gap:7px"><img src="${flagUrl(current[2])}" alt="" width="22" height="15" style="width:22px;height:15px;object-fit:cover;border-radius:2px"><strong>${current[1]}</strong></span><span style="opacity:.8">⌄</span>`;
    }

    function renderList(query = "") {
      list.innerHTML = "";
      const q = query.trim().toLowerCase();
      LANGS.filter((x) => !q || `${x[1]} ${x[3]} ${x[0]}`.toLowerCase().includes(q)).forEach((x) => {
        const row = document.createElement("button");
        row.type = "button";
        row.style.cssText = "width:100%;display:flex;align-items:center;gap:10px;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:#fff;text-align:left;cursor:pointer;font-size:12px";
        row.innerHTML = `<img src="${flagUrl(x[2])}" alt="" width="24" height="16" style="width:24px;height:16px;object-fit:cover;border-radius:2px"><strong style="width:30px;color:var(--gold-soft)">${x[1]}</strong><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x[3]}</span>`;
        row.onmouseenter = () => row.style.background = "rgba(255,255,255,.07)";
        row.onmouseleave = () => row.style.background = "transparent";
        row.onclick = () => {
          current = x;
          setReactSelect(select, x[0]);
          renderButton();
          menu.style.display = "none";
        };
        list.appendChild(row);
      });
    }

    button.onclick = (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === "block" ? "none" : "block";
      if (menu.style.display === "block") { search.value = ""; renderList(); setTimeout(() => search.focus(), 0); }
    };
    search.oninput = () => renderList(search.value);
    document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) menu.style.display = "none"; });

    renderButton(); renderList();
    menu.append(search, list); wrap.append(button, menu); select.insertAdjacentElement("afterend", wrap);
  }

  function scan() {
    document.querySelectorAll('select[aria-label="Language"]').forEach(enhance);
  }
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();