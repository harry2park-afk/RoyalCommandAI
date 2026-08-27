(()=>{
  if(location.pathname!=='/rooms/rca'||window.__rcaBridge)return;
  window.__rcaBridge=1;

  const F=window.fetch.bind(window);
  const K='royalcommand:rca:conversations:v4';
  const PK='royalcommand:rca:preferences:v4';
  const AK='royalcommand:room:rca:active-conversation';
  const SEL='royalcommand:room:rca:selected-ai';
  const LAST='royalcommand:rca:last-run:v1';
  const APPS=['chatgpt','gemini','claude','grok','email','instagram','youtube','drive','calendar','files','netflix','tasks','approval','github','crazytel','perplexity','deepseek','docs','meet','onedrive','outlook','teams','facebook'];
  const N={openai:'ChatGPT',anthropic:'Claude',google:'Gemini',xai:'Grok',deepseek:'DeepSeek',perplexity:'Perplexity',mistral:'Mistral',meta:'Meta Llama',qwen:'Qwen',cohere:'Cohere'};

  try{
    if(!localStorage.getItem(SEL))localStorage.setItem(SEL,JSON.stringify(['openai','anthropic','google','xai']));
    let p={};try{p=JSON.parse(localStorage.getItem(PK)||'{}')}catch{}
    if(!Array.isArray(p.rightPanelApps)||!p.rightPanelApps.length){p.rightPanelApps=APPS;localStorage.setItem(PK,JSON.stringify(p))}
  }catch{}

  const iso=()=>new Date().toISOString();
  const id=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const fresh=()=>{const t=iso();return{id:id('rca'),room_id:'rca',title:'New Chat',status:'active',created_at:t,updated_at:t,last_message_at:t,messages:[]}};
  const save=a=>localStorage.setItem(K,JSON.stringify(a.slice(0,100)));
  const active=x=>{if(x){sessionStorage.setItem(AK,x);localStorage.setItem('rca-active',x);return x}return sessionStorage.getItem(AK)||localStorage.getItem('rca-active')||''};
  const list=()=>{try{const a=JSON.parse(localStorage.getItem(K)||'[]');if(a.length)return a}catch{}const a=[fresh()];save(a);active(a[0].id);return a};
  const current=()=>{const a=list();let c=a.find(x=>x.id===active()&&x.status!=='archived')||a.find(x=>x.status!=='archived');if(!c){c=fresh();a.unshift(c);save(a)}active(c.id);return c};
  const meta=c=>{const{messages,...m}=c;return m};
  const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const body=async(i,o)=>{try{if(typeof o?.body==='string')return JSON.parse(o.body);if(i instanceof Request)return await i.clone().json()}catch{}return{}};

  async function session(){try{let r=await F('/api/au-v2/session',{cache:'no-store'}),d=await r.json().catch(()=>({}));if(r.ok&&d.active)return true;r=await F('/api/au-v2/enter',{method:'POST'});return r.ok}catch{return false}}
  function clearLastRun(){try{sessionStorage.removeItem(LAST)}catch{}}
  function publishLastRun(prompt,language,responses){const run={originalPrompt:String(prompt||'').trim(),language:typeof language==='string'&&language.trim()?language.trim():'ko',responses:Array.isArray(responses)?responses:[],capturedAt:Date.now()};try{sessionStorage.setItem(LAST,JSON.stringify(run))}catch{}try{window.dispatchEvent(new CustomEvent('rca:last-run',{detail:run}))}catch{}}
  function readLastRun(){try{return JSON.parse(sessionStorage.getItem(LAST)||'null')}catch{return null}}

  function persist(prompt,res){const a=list(),c=current(),t=a.find(x=>x.id===c.id)||c,n=iso();t.messages.push({id:id('u'),content:prompt,author_type:'user'});res.forEach(x=>{const name=N[x.provider]||x.provider;const txt=x.error&&!String(x.content||'').trim()?`### ${name}\n⚠️ ${x.error}`:`### ${name}\n${String(x.content||'').trim()}${x.error?`\n\n⚠️ ${x.error}`:''}`;t.messages.push({id:id('a'),content:txt,author_type:'ai'})});if(t.title==='New Chat')t.title=prompt.replace(/\s+/g,' ').slice(0,72);t.updated_at=t.last_message_at=n;save([t,...a.filter(x=>x.id!==t.id)])}
  function synthsave(txt,modelName){if(!txt)return;const a=list(),c=current(),t=a.find(x=>x.id===c.id)||c,n=iso();const label=String(modelName||'통합 AI').trim();t.messages.push({id:id('s'),content:`### 통합 답변 — ${label}\n${txt}`,author_type:'ai'});t.updated_at=t.last_message_at=n;save([t,...a.filter(x=>x.id!==t.id)])}

  window.fetch=async(i,o)=>{
    const raw=typeof i==='string'?i:i instanceof URL?i.toString():i.url;
    const u=new URL(raw,location.origin),p=u.pathname;
    const m=(o?.method||(i instanceof Request?i.method:'GET')).toUpperCase();
    if(location.pathname!=='/rooms/rca')return F(i,o);

    if(p==='/api/rooms'&&m==='GET')return J({rooms:[{id:'rca',name:'RCA Room',title:'RCA Room'},{id:'rca-ready',name:'Australia Workspace',title:'Australia Workspace'}]});
    if(p==='/api/rooms/rca'&&m==='GET')return J({room:{id:'rca',name:'RCA Room'},messages:current().messages,user:{fullName:'Royal Command Australia',defaultLanguage:'ko'}});
    if(p==='/api/rooms/rca/conversations'&&m==='GET')return J({conversations:list().map(meta)});
    if(p==='/api/rooms/rca/conversations'&&m==='POST'){const b=await body(i,o),c=fresh();if(typeof b.title==='string')c.title=b.title.slice(0,120);const a=list();a.unshift(c);save(a);active(c.id);clearLastRun();return J({conversation:meta(c)},201)}

    const q=p.match(/^\/api\/rooms\/rca\/conversations\/([^/]+)$/);
    if(q){const a=list(),c=a.find(x=>x.id===q[1]);if(!c)return J({error:'Conversation not found'},404);if(m==='GET')return J({conversation:meta(c),messages:c.messages||[]});if(m==='PATCH'){const b=await body(i,o);if(typeof b.title==='string'&&b.title.trim())c.title=b.title.trim().slice(0,120);if(b.status==='active'||b.status==='archived')c.status=b.status;c.updated_at=iso();save(a);if(c.status==='active')active(c.id);return J({conversation:meta(c)})}}

    if(p==='/api/user/preferences'){
      if(m==='GET'){let x={};try{x=JSON.parse(localStorage.getItem(PK)||'{}')}catch{}if(!Array.isArray(x.rightPanelApps)||!x.rightPanelApps.length)x.rightPanelApps=APPS;return J({preferences:x})}
      if(m==='PATCH'){const b=await body(i,o);let x={};try{x=JSON.parse(localStorage.getItem(PK)||'{}')}catch{}x={...x,...b};localStorage.setItem(PK,JSON.stringify(x));return J({preferences:x})}
    }

    if(p==='/api/ai/integrators'&&m==='GET')return F('/api/au-v2/integrators',{cache:'no-store'});

    if(p==='/api/ai/chat/stream'&&m==='POST'){
      const b=await body(i,o);if(!await session())return J({error:'RCA session failed'},401);
      const r=await F('/api/au-v2/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:b.prompt,providers:b.providers,history:b.history})});
      const d=await r.json().catch(()=>({}));if(!r.ok)return J({error:d.error||'AI request failed'},r.status);
      const res=Array.isArray(d.responses)?d.responses:[],prompt=String(b.prompt||'');persist(prompt,res);publishLastRun(prompt,b.language,res);
      const ev=res.map(x=>JSON.stringify({type:'provider',provider:x.provider,name:N[x.provider]||x.provider,content:String(x.content||''),latencyMs:x.latencyMs||0,...(x.error?{error:x.error}:{})}));
      ev.push(JSON.stringify({type:'final',result:{finalAnswer:res.find(x=>String(x.content||'').trim())?.content||'',responses:res,userMessage:{id:id('u'),content:prompt,authorType:'user'},aiMessage:null,comparison:{winners:[],notes:[],providerScores:{}}}}));
      return new Response(ev.join('\n')+'\n',{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-store'}});
    }

    if(p==='/api/ai/synthesize'&&m==='POST'){
      const b=await body(i,o);if(!await session())return J({error:'RCA session failed'},401);
      const last=readLastRun();
      const originalPrompt=typeof b.originalPrompt==='string'&&b.originalPrompt.trim()?b.originalPrompt:last?.originalPrompt;
      const responses=Array.isArray(b.responses)&&b.responses.length?b.responses:last?.responses;
      const r=await F('/api/au-v2/synthesize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({originalPrompt,modelId:b.modelId,responses})});
      const d=await r.json().catch(()=>({}));
      if(r.ok&&d.finalAnswer)synthsave(String(d.finalAnswer),d.modelName||b.modelName);
      return J(d,r.status);
    }

    return F(i,o);
  };
})();