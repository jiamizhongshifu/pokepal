import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {progressUnit} from '../../src/lib/learningProgress';
import {newFarm,migrateCrops} from '../../src/lib/farm';
import {picnicAsk,plantAsk,feedAsk,bubblesAsk,ballAsk,plantableCrops,learnedWords,isIslandSource,ISLAND_SOURCE} from '../../src/lib/islandAsk';
import {validateSave} from '../../src/lib/saveValidation';
import {readFileSync} from 'node:fs';

const fresh=()=>({version:1,settings:{level:1},wordStats:{},energy:0,balls:{poke:0,great:0,ultra:0,master:0},captures:[],daily:{caught:[]},farm:newFarm(),learning:{version:1,records:{},units:{}}} as unknown as SaveData);
const learn=(s:SaveData,n:number)=>{for(const u of LEARNING_UNITS.slice(0,n))progressUnit(s,u.id,unitRoundCount(u),100);};

test('nothing is asked before it is learned; the farm grows one more fruit per fruit word learned',()=>{
 const s=fresh();
 assert.deepEqual(learnedWords(s),[]);assert.deepEqual(plantableCrops(s),[]);
 assert.equal(plantAsk(s,0),undefined);assert.equal(feedAsk(s,0),undefined);assert.equal(picnicAsk(s,0),undefined);
 learn(s,3);
 assert.deepEqual(plantableCrops(s),['apple','banana'],'the snack lesson teaches apple and banana');
});

test('every option is a learned word, the answer is among them, and the target is what the friend says',()=>{
 const s=fresh();learn(s,8);const words=new Set(learnedWords(s));
 for(let seed=0;seed<12;seed++)for(const ask of [plantAsk(s,seed),feedAsk(s,seed)]){
  assert.ok(ask);assert.equal(ask!.options.length,3);
  assert.ok(ask!.options.every(o=>words.has(o.id)),'only learned pictures');
  assert.ok(ask!.options.some(o=>o.id===ask!.answer));assert.equal(ask!.prompt.key,ask!.answer);
  assert.equal(new Set(ask!.options.map(o=>o.id)).size,3,'no duplicate pictures');
 }
 assert.deepEqual(plantAsk(s,5),plantAsk(s,5),'the same round after a reload');
});

test('the picnic asks only for a learned fruit that is in the basket',()=>{
 const s=fresh();learn(s,3);
 assert.equal(picnicAsk(s,0),undefined,'empty basket');
 s.farm!.basket.grapes=4;assert.equal(picnicAsk(s,0),undefined,'grapes are not learned yet');
 s.farm!.basket.banana=1;
 for(let seed=0;seed<6;seed++)assert.equal(picnicAsk(s,seed)!.answer,'banana');
});

test('bubbles ask for a number; ball turns are asked only after the turn-taking lesson',()=>{
 for(let seed=0;seed<6;seed++){const a=bubblesAsk(seed);assert.ok(a.options.some(o=>o.id===a.answer));assert.match(a.answer,/^count:[1-3]$/);}
 const s=fresh();const friend={id:1,name:'啵啵',image:'f.png'},me={name:'我',avatar:'avatar-red'};
 assert.equal(ballAsk(s,true,friend,me),undefined);
 learn(s,6);
 assert.equal(ballAsk(s,true,friend,me)!.answer,'me');assert.equal(ballAsk(s,true,friend,me)!.prompt.en,'Your turn!');
 assert.equal(ballAsk(s,false,friend,me)!.answer,'friend');assert.equal(ballAsk(s,false,friend,me)!.prompt.en,'My turn!');
});

test('island answers carry their own source',()=>{
 assert.equal(ISLAND_SOURCE('picnic'),'island:picnic');assert.ok(isIslandSource('island:ball'));assert.equal(isIslandSource('unit:x'),false);
});

test('old berries become the closest learned fruit, and counts of the same fruit add up',()=>{
 const raw=JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8'));
 raw.farm={version:1,plots:[{berry:'oran',plantedAt:100},null,{berry:'cheri',plantedAt:100,wateredAt:200}],basket:{oran:2,pecha:1,cheri:3}};
 const s=validateSave(raw);
 assert.deepEqual(s.farm!.basket,{apple:1,banana:0,strawberry:3,grapes:2,watermelon:0});
 assert.equal(s.farm!.plots[0]!.berry,'grapes');assert.equal(s.farm!.plots[2]!.berry,'strawberry');
 const again=structuredClone(s);migrateCrops(again);assert.deepEqual(again.farm,s.farm,'running twice changes nothing');
});

test('island answers are read as two kinds: heard and acted on, or chose what to say in a situation',async()=>{
 const {islandAnswerKind}=await import('../../src/lib/islandAsk');
 const {summarizeOpportunities}=await import('../../src/lib/learningProgress');
 const {trialSummary,trialSummaryText}=await import('../../src/lib/trialSummary');
 assert.equal(islandAnswerKind({source:'unit:hello-island',key:'Hello!'}),undefined,'a lesson answer is not an island answer');
 assert.equal(islandAnswerKind({source:'island:errand',key:'Hello!'}),'said');
 assert.equal(islandAnswerKind({source:'island:party',key:'Good night!'}),'said');
 assert.equal(islandAnswerKind({source:'island:errand',key:'ball'}),'did','the word step of an errand is acting, not saying');
 assert.equal(islandAnswerKind({source:'island:greet',key:'Hello!'}),'did','recognising a sentence the friend said is not choosing what to say');
 assert.equal(islandAnswerKind({source:'island:ball',key:'My turn!'}),'did');
 assert.equal(islandAnswerKind({source:'island:tidy',key:'hat'}),'did');
 const now=new Date(2026,10,22,12).getTime(),o=(source:string,key:string,kind:string)=>({v:1 as const,at:now-3600000,source,key,kind:kind as any,tries:1,replays:0});
 const list=[o('island:errand','Hello!','independent'),o('island:party','Yummy!','after-hint'),o('island:errand','ball','independent'),o('island:tidy','hat','independent'),o('island:colors','red','after-model'),o('unit:x','apple','independent')];
 const did=summarizeOpportunities(list.filter(x=>islandAnswerKind(x)==='did'),now-86400000),said=summarizeOpportunities(list.filter(x=>islandAnswerKind(x)==='said'),now-86400000);
 assert.equal(did.decidable,3);assert.equal(did.independent,2);assert.equal(said.decidable,2);assert.equal(said.independent,1);
 const s={settings:{level:1,dailyMinutes:15},daily:{date:'2026-11-22',heard:1,tasksCompleted:0,playSeconds:60,words:[],spoken:0},history:[],learning:{version:1,records:{},units:{},opportunities:list}} as any;
 const t=trialSummary(s,now);
 assert.equal(t.island.decidable,5);assert.equal(t.islandDid.decidable,3);assert.equal(t.islandSaid.decidable,2);
 const text=trialSummaryText(t);assert.match(text,/小岛上听懂后去做：/);assert.match(text,/小岛上选对了要说的话：/);
});
