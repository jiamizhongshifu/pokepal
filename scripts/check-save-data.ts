import assert from 'node:assert/strict';
import { validateSave } from '../src/lib/saveValidation';
import { learningEntry } from '../src/data/curriculum';
import { learningChoices } from '../src/lib/learningChoices';
import { POKEMON } from '../src/data/pokemon';
import type { SaveData } from '../src/types';
const fixture=():SaveData=>({version:1,trainer:{name:'Test',avatar:'avatar-red',createdAt:1},energy:37,balls:{poke:1,great:0,ultra:0,master:0},captures:[{id:25,caughtAt:1,ball:'poke',friendship:12}],daily:{date:'2026-10-15',energyEarned:0,board:['listen','repeat','wordpic','trace'],boardDone:[false,false,false,false],bonusGiven:false,tasksCompleted:0,heard:0,spoken:0,words:[],caught:[],playSeconds:0,extraSeconds:0},streak:{lastDate:'',count:0},wordStats:{},settings:{dailyMinutes:15,tasksPerDay:4,level:1,favorites:[25],speechRate:1},history:[]});
const original=fixture(),copy=validateSave(original);assert.deepEqual(copy,original);copy.energy=0;assert.equal(original.energy,37);
for(const corrupt of [
 (s:any)=>s.captures[0].id=999999,
 (s:any)=>s.captures.push({...s.captures[0]}),
 (s:any)=>s.captures=null,
 (s:any)=>s.balls.poke=-1,
 (s:any)=>s.energy=NaN,
 (s:any)=>s.daily.boardDone=[false],
 (s:any)=>s.settings.dailyMinutes=0,
 (s:any)=>s.settings.idleCamera='yes',
 (s:any)=>s.learning={version:1,records:{apple:{contexts:null}},units:{}},
 (s:any)=>s.history=[{date:'2026-10-15',words:'wrong'}],
]){const bad=fixture();corrupt(bad);assert.throws(()=>validateSave(bad),/原存档未被替换/);}
const extended=fixture();extended.learning={version:1,records:{},units:{'water-break':{round:5,completedAt:1},'hello-island':{round:4,completedAt:1}}};assert.doesNotThrow(()=>validateSave(extended));extended.learning.units['water-break'].round=6;assert.throws(()=>validateSave(extended));
const camera=fixture();camera.settings.idleCamera=false;assert.equal(validateSave(camera).settings.idleCamera,false);
const legacy=fixture();legacy.settings={} as SaveData['settings'];assert.doesNotThrow(()=>validateSave(legacy));
// Preserve valid negative seed timestamps used to stagger hunger and companionship.
const care=fixture();care.captures[0].care={seconds:0,fedAt:-300,petAt:-100,quietUntil:0};assert.doesNotThrow(()=>validateSave(care));
for(const p of POKEMON)for(const key of [p.nameEn,`${p.nameEn}!`])for(let i=0;i<5;i++){
 const options=learningChoices(learningEntry(key)!,undefined,3);
 assert.equal(options.filter(o=>o.pokemonId===p.id).length,1,`${key}: exactly one correct image`);
 assert.equal(new Set(options.map(o=>o.pokemonId)).size,options.length,`${key}: unique visible options`);
}
assert.equal(learningChoices(learningEntry('Pikachu!')!,['Pikachu','Pikachu!','Eevee','Eevee!'],3).length,2);
console.log('PASS: valid legacy saves, non-mutating validation, malformed imports rejected, care compatibility and unique name choices for all 388 Pokémon.');
