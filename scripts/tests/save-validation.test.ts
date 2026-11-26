import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSave } from '../../src/lib/saveValidation';
import { learningEntry } from '../../src/data/curriculum';
import { learningChoices } from '../../src/lib/learningChoices';
import { CREATURES } from '../../src/data/creatures';
import type { SaveData } from '../../src/types';

/** A save written before the island creatures and the learning path; importing it brings it up to date. */
const legacyFixture=():SaveData=>({version:1,trainer:{name:'Test',avatar:'avatar-red',createdAt:1},energy:37,balls:{poke:1,great:0,ultra:0,master:0},captures:[{id:25,caughtAt:1,ball:'poke',friendship:12}],daily:{date:'2026-10-15',energyEarned:0,board:['listen','repeat','wordpic','trace'],boardDone:[false,false,false,false],bonusGiven:false,tasksCompleted:0,heard:0,spoken:0,words:[],caught:[],playSeconds:0,extraSeconds:0},streak:{lastDate:'',count:0},wordStats:{},settings:{dailyMinutes:15,tasksPerDay:4,level:1,favorites:[25],speechRate:1},history:[]});
/** The same save as it is kept today: what an export of an up-to-date island contains. */
const fixture=():SaveData=>validateSave(legacyFixture());

test('an up-to-date save passes unchanged, and checking it does not touch the original', () => {
  const original=fixture(),copy=validateSave(original);
  assert.deepEqual(copy,original);
  assert.notEqual(copy,original);
  copy.energy=99;copy.captures[0].friendship=0;
  assert.deepEqual(original,fixture());
});

test('a malformed import is refused and the save on the device is kept', () => {
  for(const corrupt of [
   (s:any)=>s.captures[0].id=999999,
   (s:any)=>s.captures=null,
   (s:any)=>s.balls.poke=-1,
   (s:any)=>s.energy=NaN,
   (s:any)=>s.daily.boardDone=[false],
   (s:any)=>s.settings.dailyMinutes=0,
   (s:any)=>s.settings.backgroundMusic='loud',
   (s:any)=>s.learning={version:1,records:{apple:{contexts:null}},units:{}},
   (s:any)=>s.history=[{date:'2026-10-15',words:'wrong'}],
  ]){const bad=fixture();corrupt(bad);assert.throws(()=>validateSave(bad),/原存档未被替换/,String(corrupt));}
  const extended=fixture();extended.learning={version:1,records:{},units:{'water-break':{round:5,completedAt:1},'hello-island':{round:4,completedAt:1}}};
  assert.doesNotThrow(()=>validateSave(extended));
  extended.learning.units['water-break'].round=6;assert.throws(()=>validateSave(extended));
});

test('the same friend kept twice becomes one, keeping the first meeting and the closest friendship', () => {
  const twice=fixture();twice.captures.push({...twice.captures[0],caughtAt:twice.captures[0].caughtAt+5,friendship:40});
  const merged=validateSave(twice).captures;
  assert.equal(merged.length,1);
  assert.equal(merged[0].caughtAt,twice.captures[0].caughtAt);
  assert.equal(merged[0].friendship,40);
});

test('older saves still import: retired settings, missing settings and negative care times', () => {
  // A save from before a setting was retired (island narration, lighting, idle camera).
  const retired=fixture() as any;Object.assign(retired.settings,{idleCamera:false,hqLighting:true,ambientEnglish:'more'});assert.doesNotThrow(()=>validateSave(retired));
  const legacy=fixture();legacy.settings={} as SaveData['settings'];assert.doesNotThrow(()=>validateSave(legacy));
  // Negative seed timestamps stagger hunger and companionship.
  const care=fixture();care.captures[0].care={seconds:0,fedAt:-300,petAt:-100,quietUntil:0};assert.doesNotThrow(()=>validateSave(care));
});

test('every island creature can be found by its name among unique pictures', () => {
  for(const p of CREATURES)for(const key of [p.nameEn,`${p.nameEn}!`])for(let i=0;i<5;i++){
   const options=learningChoices(learningEntry(key)!,undefined,3);
   assert.equal(options.filter(o=>o.pokemonId===p.id).length,1,`${key}: exactly one correct image`);
   assert.equal(new Set(options.map(o=>o.pokemonId)).size,options.length,`${key}: unique visible options`);
  }
  assert.equal(learningChoices(learningEntry('Bubbo!')!,['Bubbo','Bubbo!','Berry','Berry!'],3).length,2);
});
