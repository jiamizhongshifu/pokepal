import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSave } from '../../src/lib/saveValidation';
import { diaryPages } from '../../src/lib/diary';
import type { SaveData } from '../../src/types';
const make=()=>{const s=JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')) as SaveData;delete s.islandProgress;delete s.islandLiving;s.energy=30;return s;};
test('records of the retired island screen are kept as stored but must still be objects',()=>{const s=make();(s as any).islandLiving={version:1,furniture:['track'],memories:[{id:'a'}]};(s as any).picnic={version:1,memories:[]};s.captures[0].personality={version:1,preference:'ball'};const back=validateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(back.islandLiving,s.islandLiving);assert.deepEqual(back.picnic,s.picnic);for(const bad of [{islandLiving:[]},{picnic:'x'}])assert.throws(()=>validateSave({...JSON.parse(JSON.stringify(s)),...bad}));});
test('diary pagination preserves original wording and punctuation without inventing events',()=>{for(const text of ['今天和啵啵玩球。然后我说：谢谢你！\n我有一点累。','今天我很难过……但是妈妈陪着我。', 'a'.repeat(1200)]){const pages=diaryPages(text);assert.equal(pages.map(p=>p.zh).join(''),text);assert.ok(pages.every(p=>p.zh.length<=160));}assert.deepEqual(diaryPages('  '),[]);assert.equal(diaryPages('我很难过。')[0].en,'I need a rest.');});
