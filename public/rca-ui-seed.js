(()=>{
  if(location.pathname!=='/rooms/rca')return;

  try{
    const M='royalcommand:rca:four-ai-synthesis-seed-v1';
    if(localStorage.getItem(M)!=='1'){
      localStorage.setItem('royalcommand:room:rca:selected-ai',JSON.stringify(['openai','anthropic','google','xai']));
      localStorage.setItem('royalcommand:room:/rooms/rca:compact-ai-dock',JSON.stringify(['ChatGPT','Claude','Gemini','Grok']));
      localStorage.setItem(M,'1');
    }
  }catch{}

  if(window.__rcaRoleTestBridge)return;
  window.__rcaRoleTestBridge=1;

  const F=window.fetch.bind(window);
  const readBody=async(i,o)=>{
    try{
      if(typeof o?.body==='string')return JSON.parse(o.body);
      if(i instanceof Request)return await i.clone().json();
    }catch{}
    return{};
  };
  const ensureSession=async()=>{
    try{
      let r=await F('/api/au-v2/session',{cache:'no-store'});
      let d=await r.json().catch(()=>({}));
      if(r.ok&&d.active)return true;
      r=await F('/api/au-v2/enter',{method:'POST'});
      return r.ok;
    }catch{return false;}
  };
  const J=(d,s=200)=>new Response(JSON.stringify(d),{
    status:s,
    headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
  });

  window.fetch=async(i,o)=>{
    const raw=typeof i==='string'?i:i instanceof URL?i.toString():i.url;
    const u=new URL(raw,location.origin);
    const method=(o?.method||(i instanceof Request?i.method:'GET')).toUpperCase();

    if(location.pathname==='/rooms/rca'&&u.pathname==='/api/ai/chat/stream'&&method==='POST'){
      const b=await readBody(i,o);
      const prompt=typeof b.prompt==='string'?b.prompt.trim():'';
      if(/^\/role-test(?:\s|$)/i.test(prompt)){
        if(!await ensureSession())return J({error:'RCA session failed'},401);
        const task=prompt.replace(/^\/role-test\s*/i,'').trim();
        const r=await F('/api/au-v2/role-test',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({task})
        });
        const d=await r.json().catch(()=>({}));
        if(!r.ok)return J({error:d.error||'Role test failed'},r.status);

        const results=Array.isArray(d.results)?d.results:[];
        const events=results.map(x=>JSON.stringify({
          type:'provider',
          provider:x.provider,
          name:x.role||x.provider,
          content:`[${x.role||x.provider}]\n${String(x.content||'').trim()}${x.error?`\n\n⚠️ ${x.error}`:''}`,
          latencyMs:x.latencyMs||0,
          ...(x.error?{error:x.error}:{})
        }));
        events.push(JSON.stringify({
          type:'final',
          result:{
            finalAnswer:results.map(x=>`### ${x.role}\n${x.content||x.error||''}`).join('\n\n'),
            responses:results.map(x=>({provider:x.provider,content:`[${x.role}]\n${x.content||''}`,...(x.error?{error:x.error}:{})})),
            userMessage:{id:`role-${Date.now()}`,content:prompt,authorType:'user'},
            aiMessage:null,
            comparison:{winners:[],notes:['RCA role verification only — no write authority granted.'],providerScores:{}}
          }
        }));
        return new Response(events.join('\n')+'\n',{
          headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-store'}
        });
      }
    }

    return F(i,o);
  };
})();
