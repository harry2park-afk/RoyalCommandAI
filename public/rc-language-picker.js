(() => {
  const LANGS = [
    ["ko-KR","KR","kr","한국어"],["en-AU","AU","au","English (Australia)"],["en-US","US","us","English (United States)"],["en-GB","UK","gb","English (United Kingdom)"],["en-CA","CA","ca","English (Canada)"],["en-NZ","NZ","nz","English (New Zealand)"],["ja-JP","JP","jp","日本語"],["zh-CN","CN","cn","中文 (简体)"],["zh-TW","TW","tw","中文 (繁體)"],["es-ES","ES","es","Español"],["es-MX","MX","mx","Español (México)"],["es-AR","AR","ar","Español (Argentina)"],["fr-FR","FR","fr","Français"],["fr-CA","CA","ca","Français (Canada)"],["de-DE","DE","de","Deutsch"],["it-IT","IT","it","Italiano"],["pt-BR","BR","br","Português (Brasil)"],["pt-PT","PT","pt","Português (Portugal)"],["nl-NL","NL","nl","Nederlands"],["nl-BE","BE","be","Nederlands (België)"],["ru-RU","RU","ru","Русский"],["uk-UA","UA","ua","Українська"],["pl-PL","PL","pl","Polski"],["cs-CZ","CZ","cz","Čeština"],["sk-SK","SK","sk","Slovenčina"],["hu-HU","HU","hu","Magyar"],["ro-RO","RO","ro","Română"],["bg-BG","BG","bg","Български"],["sr-RS","RS","rs","Српски"],["hr-HR","HR","hr","Hrvatski"],["sl-SI","SI","si","Slovenščina"],["bs-BA","BA","ba","Bosanski"],["mk-MK","MK","mk","Македонски"],["el-GR","GR","gr","Ελληνικά"],["tr-TR","TR","tr","Türkçe"],["ar-SA","SA","sa","العربية"],["ar-AE","AE","ae","العربية (الإمارات)"],["he-IL","IL","il","עברית"],["fa-IR","IR","ir","فارسی"],["ur-PK","PK","pk","اردو"],["hi-IN","IN","in","हिन्दी"],["bn-BD","BD","bd","বাংলা"],["pa-IN","IN","in","ਪੰਜਾਬੀ"],["gu-IN","IN","in","ગુજરાતી"],["mr-IN","IN","in","मराठी"],["ta-IN","IN","in","தமிழ்"],["te-IN","IN","in","తెలుగు"],["kn-IN","IN","in","ಕನ್ನಡ"],["ml-IN","IN","in","മലയാളം"],["ne-NP","NP","np","नेपाली"],["si-LK","LK","lk","සිංහල"],["th-TH","TH","th","ไทย"],["vi-VN","VN","vn","Tiếng Việt"],["id-ID","ID","id","Bahasa Indonesia"],["ms-MY","MY","my","Bahasa Melayu"],["fil-PH","PH","ph","Filipino"],["km-KH","KH","kh","ខ្មែរ"],["lo-LA","LA","la","ລາວ"],["my-MM","MM","mm","မြန်မာ"],["mn-MN","MN","mn","Монгол"],["kk-KZ","KZ","kz","Қазақша"],["uz-UZ","UZ","uz","Oʻzbekcha"],["az-AZ","AZ","az","Azərbaycan"],["ka-GE","GE","ge","ქართული"],["hy-AM","AM","am","Հայերեն"],["sw-KE","KE","ke","Kiswahili"],["am-ET","ET","et","አማርኛ"],["af-ZA","ZA","za","Afrikaans"],["zu-ZA","ZA","za","isiZulu"],["xh-ZA","ZA","za","isiXhosa"],["ha-NG","NG","ng","Hausa"],["yo-NG","NG","ng","Yorùbá"],["ig-NG","NG","ng","Igbo"],["so-SO","SO","so","Soomaali"],["sq-AL","AL","al","Shqip"],["et-EE","EE","ee","Eesti"],["lv-LV","LV","lv","Latviešu"],["lt-LT","LT","lt","Lietuvių"],["fi-FI","FI","fi","Suomi"],["sv-SE","SE","se","Svenska"],["no-NO","NO","no","Norsk"],["da-DK","DK","dk","Dansk"],["is-IS","IS","is","Íslenska"],["ca-ES","ES","es","Català"],["eu-ES","ES","es","Euskara"],["gl-ES","ES","es","Galego"],["cy-GB","UK","gb","Cymraeg"],["ga-IE","IE","ie","Gaeilge"],["mt-MT","MT","mt","Malti"],["lb-LU","LU","lu","Lëtzebuergesch"],["be-BY","BY","by","Беларуская"],["ps-AF","AF","af","پښتو"],["sd-PK","PK","pk","سنڌي"],["jv-ID","ID","id","Basa Jawa"],["su-ID","ID","id","Basa Sunda"],["ceb-PH","PH","ph","Cebuano"],["mg-MG","MG","mg","Malagasy"],["mi-NZ","NZ","nz","Māori"],["sm-WS","WS","ws","Gagana Samoa"],["ht-HT","HT","ht","Kreyòl Ayisyen"],["eo-EO","UN","un","Esperanto"]
  ];

  const ORDER_KEY = "royalcommand:language-order-v3";
  const HIDDEN_KEY = "royalcommand:hidden-languages";
  const SELECTED_KEY = "royalcommand:selected-language";
  const byValue = new Map(LANGS.map((x) => [x[0], x]));
  const flagUrl = (cc) => `https://flagcdn.com/w40/${cc}.png`;
  const DEFAULT_ORDER = LANGS.slice().sort((a,b)=>a[1].localeCompare(b[1],"en") || a[3].localeCompare(b[3],"en")).map(x=>x[0]);

  function loadOrder(){
    try{
      const raw=localStorage.getItem(ORDER_KEY);
      if(!raw){ localStorage.setItem(ORDER_KEY,JSON.stringify(DEFAULT_ORDER)); return [...DEFAULT_ORDER]; }
      const saved=JSON.parse(raw);
      const valid=saved.filter(v=>byValue.has(v));
      const missing=DEFAULT_ORDER.filter(v=>!valid.includes(v));
      return [...valid,...missing];
    }catch{return [...DEFAULT_ORDER];}
  }
  function saveOrder(order){localStorage.setItem(ORDER_KEY,JSON.stringify(order));}
  function loadHidden(){try{return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)||"[]").filter(v=>byValue.has(v)));}catch{return new Set();}}
  function saveHidden(hidden){localStorage.setItem(HIDDEN_KEY,JSON.stringify([...hidden]));}

  function setReactSelect(select,value){
    if(![...select.options].some(o=>o.value===value)){const o=document.createElement("option");o.value=value;o.textContent=value;select.appendChild(o);}
    const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value")?.set;
    setter?.call(select,value);select.dispatchEvent(new Event("input",{bubbles:true}));select.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function enhance(select){
    if(select.dataset.rcLangEnhanced==="1")return;
    select.dataset.rcLangEnhanced="1";
    Object.assign(select.style,{position:"absolute",opacity:"0",pointerEvents:"none",width:"1px",height:"1px"});

    const wrap=document.createElement("div");wrap.className="rc-lang-picker";wrap.style.cssText="position:relative;flex:0 0 auto;margin-left:auto;z-index:2147483646";
    const button=document.createElement("button");button.type="button";button.style.cssText="height:32px;width:170px;display:flex;align-items:center;justify-content:space-between;gap:7px;padding:0 10px;border:1px solid #f2cf24;border-radius:8px;background:var(--bg);color:var(--text);font-size:12px;cursor:pointer;box-sizing:border-box;box-shadow:inset 0 0 0 1px #1d4ed8,inset 0 0 0 2px #c81e1e";
    const menu=document.createElement("div");menu.style.cssText="display:none;position:fixed;width:380px;overflow:hidden;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:#0b1220;box-shadow:0 22px 70px rgba(0,0,0,.8);z-index:2147483647;flex-direction:column";
    const hint=document.createElement("div");hint.textContent="Drag to reorder, or hide countries you do not use.";hint.style.cssText="padding:7px 10px 0;color:#9aa6b2;font-size:10px;flex:0 0 auto";
    const tools=document.createElement("div");tools.style.cssText="display:flex;gap:6px;padding:8px;flex:0 0 auto";
    const search=document.createElement("input");search.type="text";search.placeholder="Search country or language…";search.style.cssText="flex:1;min-width:0;padding:8px 10px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:#070b14;color:#fff;font-size:12px;outline:none";
    const hiddenToggle=document.createElement("button");hiddenToggle.type="button";hiddenToggle.style.cssText="border:1px solid rgba(255,255,255,.12);border-radius:8px;background:#111827;color:#fff;padding:0 10px;font-size:11px;cursor:pointer;white-space:nowrap";
    tools.append(search,hiddenToggle);
    const list=document.createElement("div");list.style.cssText="flex:1 1 auto;min-height:0;overflow-y:auto;padding:0 6px 7px;scroll-behavior:auto";

    const selectValue=select.value==="ko"?"ko-KR":select.value==="en"?"en-AU":select.value;
    const remembered=localStorage.getItem(SELECTED_KEY);
    let current=byValue.get(remembered)||byValue.get(selectValue)||LANGS[0];
    let order=loadOrder();
    let hidden=loadHidden();
    let showHidden=false;
    hidden.delete(current[0]); saveHidden(hidden);
    localStorage.setItem(SELECTED_KEY,current[0]); setReactSelect(select,current[0]);

    function renderButton(){button.innerHTML=`<span style="display:flex;align-items:center;gap:7px"><img src="${flagUrl(current[2])}" width="22" height="15" style="width:22px;height:15px;object-fit:cover;border-radius:2px"><strong>${current[1]}</strong></span><span style="opacity:.8">⌄</span>`;}
    function positionMenu(){const rect=button.getBoundingClientRect();const top=Math.max(4,rect.bottom+4);const right=Math.max(8,window.innerWidth-rect.right);const available=Math.max(220,window.innerHeight-top-8);menu.style.top=`${top}px`;menu.style.right=`${right}px`;menu.style.height=`${available}px`;menu.style.maxHeight=`${available}px`;}
    function moveTo(dragValue,targetValue,after=false){if(!dragValue||!targetValue||dragValue===targetValue)return;const next=order.filter(v=>v!==dragValue);let i=next.indexOf(targetValue);if(i<0)i=next.length;if(after)i+=1;next.splice(i,0,dragValue);order=next;saveOrder(order);}

    function renderList(query=""){
      list.innerHTML="";
      hiddenToggle.textContent=showHidden?`Visible list`:`Hidden (${hidden.size})`;
      const q=query.trim().toLowerCase();
      const items=order.map(v=>byValue.get(v)).filter(Boolean).filter(x=>(showHidden?hidden.has(x[0]):!hidden.has(x[0])) && (!q||`${x[1]} ${x[3]} ${x[0]}`.toLowerCase().includes(q)));
      items.forEach(x=>{
        const row=document.createElement("div");row.draggable=!q&&!showHidden;row.dataset.value=x[0];row.style.cssText=`width:100%;display:flex;align-items:center;gap:8px;padding:6px 7px;border-radius:7px;background:${x[0]===current[0]?"rgba(212,175,55,.12)":"transparent"};color:#fff;font-size:12px;cursor:${row.draggable?"grab":"default"};user-select:none`;
        const actionLabel=showHidden?"Show":"Hide";
        const actionDisabled=!showHidden&&x[0]===current[0];
        row.innerHTML=`<span style="width:14px;color:#7f8c9d">${showHidden?"":"↕"}</span><img src="${flagUrl(x[2])}" width="24" height="16" style="width:24px;height:16px;object-fit:cover;border-radius:2px"><strong style="width:30px;color:var(--gold-soft)">${x[1]}</strong><span class="rc-lang-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${x[3]}</span><button type="button" data-hide ${actionDisabled?"disabled":""} style="border:1px solid rgba(255,255,255,.12);background:${actionDisabled?"#1a1f2a":"#111827"};color:${actionDisabled?"#657080":"#fff"};border-radius:6px;min-width:52px;height:26px;padding:0 8px;cursor:${actionDisabled?"not-allowed":"pointer"};font-size:10px">${actionLabel}</button>${x[0]===current[0]?'<span style="font-size:9px;color:var(--gold-soft);width:52px">SELECTED</span>':'<span style="width:52px"></span>'}`;
        row.querySelector("[data-hide]").onclick=e=>{e.stopPropagation();if(actionDisabled)return;if(showHidden)hidden.delete(x[0]);else hidden.add(x[0]);saveHidden(hidden);renderList(search.value);};
        row.querySelector(".rc-lang-name").onclick=()=>{current=x;hidden.delete(x[0]);saveHidden(hidden);localStorage.setItem(SELECTED_KEY,x[0]);setReactSelect(select,x[0]);renderButton();menu.style.display="none";};
        row.ondragstart=e=>{if(!row.draggable)return;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",x[0]);row.style.opacity=".45";};
        row.ondragend=()=>{row.style.opacity="1";};
        row.ondragover=e=>{if(!row.draggable)return;e.preventDefault();e.dataTransfer.dropEffect="move";row.style.outline="0 0 0 1px #d4af37 inset";};
        row.ondragleave=()=>{row.style.outline="none";};
        row.ondrop=e=>{if(!row.draggable)return;e.preventDefault();row.style.outline="none";const r=row.getBoundingClientRect();moveTo(e.dataTransfer.getData("text/plain"),x[0],e.clientY>r.top+r.height/2);renderList();};
        row.onclick=e=>{if(e.target.closest("button"))return;current=x;hidden.delete(x[0]);saveHidden(hidden);localStorage.setItem(SELECTED_KEY,x[0]);setReactSelect(select,x[0]);renderButton();menu.style.display="none";};
        list.appendChild(row);
      });
    }

    list.addEventListener("dragover",e=>{if(search.value||showHidden)return;e.preventDefault();const r=list.getBoundingClientRect();const edge=120;const speed=72;if(e.clientY<r.top+edge)list.scrollTop-=speed;else if(e.clientY>r.bottom-edge)list.scrollTop+=speed;});
    hiddenToggle.onclick=e=>{e.stopPropagation();showHidden=!showHidden;search.value="";renderList();};
    button.onclick=e=>{e.stopPropagation();const opening=menu.style.display!=="flex";menu.style.display=opening?"flex":"none";if(opening){order=loadOrder();hidden=loadHidden();showHidden=false;positionMenu();search.value="";renderList();setTimeout(()=>search.focus(),0);}};
    search.oninput=()=>renderList(search.value);
    window.addEventListener("resize",()=>{if(menu.style.display==="flex")positionMenu();});
    window.addEventListener("scroll",()=>{if(menu.style.display==="flex")positionMenu();},true);
    document.addEventListener("click",e=>{if(!wrap.contains(e.target)&&!menu.contains(e.target))menu.style.display="none";});
    renderButton();renderList();menu.append(hint,tools,list);document.body.appendChild(menu);wrap.append(button);select.insertAdjacentElement("afterend",wrap);
  }
  function scan(){document.querySelectorAll('select[aria-label="Language"]').forEach(enhance);}
  scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();