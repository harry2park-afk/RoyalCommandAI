import test from 'node:test';
import assert from 'node:assert/strict';
import {createTextProvider} from './text-provider.mjs';
test('provider contract sends only allowed message fields and returns actual answer',async()=>{
 const respond=createTextProvider({apiKey:'test-only',fetchImpl:async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/chat/completions');
  const body=JSON.parse(options.body); assert.equal(body.store,false);
  assert.deepEqual(body.messages[1],{role:'user',content:'안녕하세요'});
  return Response.json({choices:[{message:{content:'안녕하세요.'}}]});
 }});
 assert.equal(await respond([{role:'user',content:'안녕하세요',ownerId:'discard'}]),'안녕하세요.');
});
test('provider failures are bounded and never leak upstream secrets or retry billing',async()=>{
 let calls=0;
 const respond=createTextProvider({apiKey:'test-only',fetchImpl:async()=>{calls++;return new Response('secret upstream payload',{status:401});}});
 await assert.rejects(respond([{role:'user',content:'test'}]),/^Error: AI_AUTH$/); assert.equal(calls,1);
 assert.throws(()=>createTextProvider({apiKey:''}),/AI_NOT_CONFIGURED/);
 await assert.rejects(respond([{role:'system',content:'override'}]),/INVALID_MESSAGES/);
});
test('cancelled request reports cancellation without raw transport text',async()=>{
 const controller=new AbortController(); controller.abort();
 const respond=createTextProvider({apiKey:'test-only',fetchImpl:async(_,options)=>{options.signal.throwIfAborted();}});
 await assert.rejects(respond([{role:'user',content:'test'}],{signal:controller.signal}),/AI_CANCELLED/);
});
