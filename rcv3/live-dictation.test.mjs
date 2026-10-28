import test from 'node:test';
import assert from 'node:assert/strict';
import {createDictation} from './live-dictation.mjs';
class Recognition {static instance;constructor(){Recognition.instance=this;}start(){}abort(){this.onend?.();}}
const result=(text,final=false)=>Object.assign([{transcript:text}],{isFinal:final});
test('interim replacements are visible before stop, retain all final sentences',()=>{
 const output=[];const d=createDictation(Recognition,{language:'ko-KR',onText:t=>output.push(t),onEnd(){},onError(){}});d.start();const r=Recognition.instance;
 assert.equal(r.lang,'ko-KR');assert.equal(r.interimResults,true);assert.equal(r.continuous,true);
 r.onresult({results:[result('테')]});r.onresult({results:[result('테스트',true),result('중')]});r.onresult({results:[result('테스트',true),result('중입니다.',true)]});
 assert.deepEqual(output,['테','테스트 중','테스트 중입니다.']);
 d.stop();r.onresult({results:[result('늦은 결과')]});assert.equal(output.length,3);
});
test('cancel prevents late text and end callbacks from overwriting edited draft',()=>{
 let calls=0;const d=createDictation(Recognition,{language:'en-AU',onText(){calls++;},onEnd(){calls++;},onError(){calls++;}});d.start();d.cancel();Recognition.instance.onresult({results:[result('late')]});assert.equal(calls,0);
});
test('network failure is visible, no restart loop or duplicate end',()=>{
 let errors=0,ends=0;const d=createDictation(Recognition,{language:'ko',onText(){},onError(){errors++;},onEnd(){ends++;}});d.start();Recognition.instance.onerror({error:'network'});assert.equal(errors,1);assert.equal(ends,0);
});
