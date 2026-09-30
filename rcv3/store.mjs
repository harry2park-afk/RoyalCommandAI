// Local development persistence only. Not a cloud database or authentication layer.
import { DatabaseSync } from 'node:sqlite';
import {validateButtonAppearance} from './button-appearance.mjs';
import { randomUUID } from 'node:crypto';
import { defaultDesign, editDesign, copyDesignToDraft } from './core.mjs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY, owner TEXT NOT NULL, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS identities(room TEXT NOT NULL REFERENCES rooms(id), button TEXT NOT NULL, capability TEXT NOT NULL, PRIMARY KEY(room,button));
    CREATE TABLE IF NOT EXISTS appearances(room TEXT NOT NULL REFERENCES rooms(id), control TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(room,control));
    CREATE TABLE IF NOT EXISTS messages(seq INTEGER PRIMARY KEY, room TEXT NOT NULL REFERENCES rooms(id), scope TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL);`);
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const result=fn(); db.exec('COMMIT'); return result; }
    catch(error) { db.exec('ROLLBACK'); throw error; }
  };
  function get(owner,id) {
    const row=db.prepare('SELECT body FROM rooms WHERE id=? AND owner=?').get(id,owner);
    if (!row) throw new Error('ACCESS_DENIED');
    return JSON.parse(row.body);
  }
  function save(room) {
    for(const button of room.design.buttons) {
      const prior=db.prepare('SELECT capability FROM identities WHERE room=? AND button=?').get(room.id,button.id);
      if(prior && prior.capability!==button.capability) throw new Error('CAPABILITY_LOCKED');
    }
    db.prepare('INSERT INTO rooms VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(room.id,room.ownerId,JSON.stringify(room));
    for(const button of room.design.buttons) db.prepare('INSERT OR IGNORE INTO identities VALUES(?,?,?)').run(room.id,button.id,button.capability);
    return room;
  }
  // owner must originate from a verified server session; never expose this API directly.
  return {
    close:()=>db.close(), get,
    create(owner) {
      if(typeof owner!=='string'||!uuid.test(owner)) throw new Error('ACCESS_DENIED');
      return transaction(()=>save({id:randomUUID(),ownerId:owner,name:'RCV3',status:'draft',revision:0,design:defaultDesign()}));
    },
    edit:(owner,id,revision,design)=>transaction(()=>save(editDesign(get(owner,id),owner,revision,design))),
    clone:(owner,id)=>transaction(()=>{
      const copy=save(copyDesignToDraft(get(owner,id),owner));
      // Runtime/personal settings do not travel with a portable draft.
      return copy;
    }),
    saveAppearance(owner,id,control,revision,input){
      return transaction(()=>{
        const room=get(owner,id);
        if(!['microphone','send'].includes(control)&&!room.design.buttons.some(button=>button.id===control))throw new Error('UNKNOWN_CONTROL');
        const previous=db.prepare('SELECT revision FROM appearances WHERE room=? AND control=?').get(id,control);
        if(revision!==(previous?.revision??0))throw new Error('EDIT_CONFLICT');
        const patch=validateButtonAppearance(input);
        db.prepare('INSERT INTO appearances VALUES(?,?,?,?) ON CONFLICT(room,control) DO UPDATE SET revision=excluded.revision,body=excluded.body').run(id,control,revision+1,JSON.stringify(patch));
        return {revision:revision+1,patch};
      });
    },
    appearance(owner,id,control){
      get(owner,id);
      const row=db.prepare('SELECT revision,body FROM appearances WHERE room=? AND control=?').get(id,control);
      return row?{revision:row.revision,patch:JSON.parse(row.body)}:{revision:0,patch:{}};
    },
    append(owner,id,scope,role,content) {
      if(!['chat','secretary'].includes(scope)||!['user','assistant'].includes(role)||typeof content!=='string'||!content.trim()||content.length>32000) throw new Error('INVALID_MESSAGE');
      return transaction(()=>{get(owner,id); db.prepare('INSERT INTO messages(room,scope,role,content) VALUES(?,?,?,?)').run(id,scope,role,content);});
    },
    history(owner,id,scope) {
      get(owner,id);
      if(!['chat','secretary'].includes(scope)) throw new Error('INVALID_SCOPE');
      return db.prepare('SELECT role,content FROM messages WHERE room=? AND scope=? ORDER BY seq').all(id,scope);
    },
  };
}
