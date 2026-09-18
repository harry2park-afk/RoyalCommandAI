import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {openStore} from './store.mjs';
test('durable edit, isolated history, empty clone, restart and lifetime capability lock',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rcv3-')); const file=join(dir,'rooms.sqlite'); let store=openStore(file);
 try {
  const owner=randomUUID(), other=randomUUID(), room=store.create(owner);
  const design=structuredClone(room.design); design.buttons[0].label='개인 비서'; design.buttons[0].x=40; design.buttons[0].opacity=0;
  store.edit(owner,room.id,0,design);
  store.saveAppearance(owner,room.id,'send',0,{width:80,height:30,label:'보내기',textColor:'#88ffcc'});
  assert.throws(()=>store.edit(owner,room.id,0,design),/EDIT_CONFLICT/);
  store.append(owner,room.id,'chat','user','테스트'); store.append(owner,room.id,'secretary','user','비서 전용');
  assert.throws(()=>store.history(other,room.id,'chat'),/ACCESS_DENIED/);
  assert.throws(()=>store.clone(other,room.id),/ACCESS_DENIED/);
  const copy=store.clone(owner,room.id); assert.notEqual(copy.id,room.id); assert.equal(copy.status,'draft');
  assert.deepEqual(copy.design,design); assert.deepEqual(store.history(owner,copy.id,'chat'),[]);
  store.close(); store=openStore(file);
  assert.equal(store.get(owner,room.id).design.buttons[0].label,'개인 비서');
  assert.equal(store.appearance(owner,room.id,'send').patch.width,80);
  assert.equal(store.appearance(owner,room.id,'send').patch.label,'보내기');
  assert.deepEqual(store.history(owner,room.id,'chat').map(x=>x.content),['테스트']);
  store.edit(owner,room.id,1,{backgroundAssetId:null,buttons:[]});
  design.buttons[0].id=design.buttons[0].id.toUpperCase();
  design.buttons[0].capability='secretary';
  assert.throws(()=>store.edit(owner,room.id,2,design),/CAPABILITY_LOCKED/);
  assert.equal(store.get(owner,room.id).revision,2);
  assert.deepEqual(store.get(owner,room.id).design.buttons,[]);
 } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
