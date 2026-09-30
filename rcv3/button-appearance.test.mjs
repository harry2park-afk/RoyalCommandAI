import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openStore} from './store.mjs';
import {validateButtonAppearance} from './button-appearance.mjs';
test('existing RC appearance schema keeps clear borders and rejects execution fields',()=>{
 const patch=validateButtonAppearance({width:50,height:30,offsetX:20,label:'보내기',backgroundColor:'#112233',borderWidth:0});
 assert.equal(patch.borderWidth,0);assert.equal(patch.label,'보내기');
 assert.throws(()=>validateButtonAppearance({onclick:'run()'}),/INVALID_APPEARANCE/);
 assert.throws(()=>validateButtonAppearance({backgroundColor:'url(evil)'}),/INVALID_APPEARANCE/);
});
test('button appearance edits enforce owner/revision and clone only design',()=>{
 const store=openStore(':memory:');
 try{
 const owner=randomUUID(),room=store.create(owner);
 store.saveAppearance(owner,room.id,'microphone',0,{width:75,height:30,label:'말하기',borderWidth:0});
 assert.throws(()=>store.saveAppearance(owner,room.id,'microphone',0,{}),/EDIT_CONFLICT/);
 assert.throws(()=>store.appearance(randomUUID(),room.id,'microphone'),/ACCESS_DENIED/);
 assert.throws(()=>store.saveAppearance(owner,room.id,'admin',0,{}),/UNKNOWN_CONTROL/);
 const copy=store.clone(owner,room.id);
 assert.deepEqual(store.appearance(owner,copy.id,'microphone'),{revision:0,patch:{}});
 store.saveAppearance(owner,copy.id,'microphone',0,{label:'다른 방'});
 assert.equal(store.appearance(owner,room.id,'microphone').patch.label,'말하기');
 }finally{store.close();}
});
