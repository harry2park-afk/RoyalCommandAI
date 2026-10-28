// Independent server-only adapter. No legacy room orchestration or customer-supplied URLs.
export function createTextProvider({apiKey, model='gpt-4.1-mini', fetchImpl=fetch, timeoutMs=20000}) {
  if(typeof apiKey!=='string'||!apiKey.trim()) throw new Error('AI_NOT_CONFIGURED');
  if(!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>60000) throw new Error('INVALID_TIMEOUT');
  return async function respond(messages,{signal}={}) {
    if(!Array.isArray(messages)||!messages.length||messages.length>40||messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>16000)) throw new Error('INVALID_MESSAGES');
    const deadline=AbortSignal.timeout(timeoutMs);
    let response;
    try {
      response=await fetchImpl('https://api.openai.com/v1/chat/completions',{
        method:'POST',signal:signal?AbortSignal.any([signal,deadline]):deadline,
        headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({model,store:false,max_completion_tokens:1200,messages:[
          {role:'system',content:'Answer the user directly in their language. You have no external action tools. Never claim to have saved, sent, scheduled or completed an external action.'},
          ...messages.map(({role,content})=>({role,content})),
        ]}),
      });
      if(!response.ok) throw new Error(response.status===429?'AI_CAPACITY':response.status===401||response.status===403?'AI_AUTH':'AI_UPSTREAM');
      const result=await response.json();
      const answer=result?.choices?.[0]?.message?.content;
      if(typeof answer!=='string'||!answer.trim()) throw new Error('AI_EMPTY_RESPONSE');
      return answer;
    } catch(error) {
      if(signal?.aborted) throw new Error('AI_CANCELLED');
      if(deadline.aborted) throw new Error('AI_TIMEOUT');
      if(['AI_CAPACITY','AI_AUTH','AI_UPSTREAM','AI_EMPTY_RESPONSE'].includes(error.message)) throw error;
      throw new Error('AI_CONNECTION');
    }
  };
}
