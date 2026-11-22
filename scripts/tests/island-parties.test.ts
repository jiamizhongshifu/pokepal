import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {LEARNING_UNITS,LEARNING_CHAPTERS,unitRoundCount,learningEntry} from '../../src/data/curriculum';
import {progressUnit} from '../../src/lib/learningProgress';
import {finishErrand} from '../../src/island/errands';
import {partyReady,partyAt,partySteps,finishParty,islandNow,chapterUsed,validParties,PARTY_WEEK} from '../../src/island/parties';
import {PLAYS,ROUNDS,playAsk,playById,playsAt,comboReady,COMBO_FROM,lessonsDone,freeItems,LEAD_REACTIONS,islandToday,comboLines,ownPlay,OWN_SPECIES} from '../../src/island/plays';
import {validateSave} from '../../src/lib/saveValidation';
import {comboLine} from '../../src/lib/islandAsk';

const DAY=86400000,NOW=Math.floor(Date.UTC(2026,10,22,10)/PARTY_WEEK)*PARTY_WEEK+DAY;
const fixture=()=>{const s=validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];s.learning!.records={};delete s.islandTraces;delete s.islandParties;return s;};
const learn=(s:SaveData,n:number)=>{for(const u of LEARNING_UNITS.slice(0,n))progressUnit(s,u.id,unitRoundCount(u),100);};
const use=(s:SaveData,n:number)=>{for(const u of LEARNING_UNITS.slice(0,n))finishErrand(s,u.id,undefined,200);};

test('a chapter party waits until all four lessons were used on the island, and uses each lesson\'s sentence once',()=>{
 const s=fixture();learn(s,4);use(s,3);
 assert.equal(chapterUsed(s,0),false);assert.equal(partyReady(s,NOW),undefined,'one errand still open');
 use(s,4);
 const p=partyReady(s,NOW)!;assert.equal(p.chapter,0);assert.equal(p.place.id,'picnic','the picnic blanket once the path has opened it');
 assert.equal(partyAt(s,'picnic',NOW)!.chapter,0);assert.equal(partyAt(s,'tent',NOW),undefined);
 const steps=partySteps(s,p,'t');
 assert.deepEqual(steps.map(x=>x.ask.answer),LEARNING_UNITS.slice(0,4).map(u=>u.phrase));
 for(const [i,st] of steps.entries()){assert.equal(st.kind,'say');assert.equal(st.ask.situation,LEARNING_UNITS[i].situation);assert.equal(st.ask.play,'party');assert.equal(st.ask.options.length,2);}
});

test('the island suggests the party after the path stop; holding it is remembered, valid save data, and good for every friend',()=>{
 const s=fixture();learn(s,4);use(s,4);
 const before=s.captures.map(c=>c.played??Math.floor(c.friendship/16));
 const t=islandNow(s,NOW);
 if(islandToday(s,NOW).kind==='path')assert.equal(t.kind,'path');
 else{assert.equal(t.kind,'party');if(t.kind==='party'){assert.equal(t.station,'picnic');assert.equal(t.chapter,0);assert.equal(t.phrase.en,'Hello!');}}
 assert.equal(finishParty(s,1,NOW),false,'a chapter not finished has no party');
 assert.equal(finishParty(s,0,NOW),true);
 assert.deepEqual(s.captures.map(c=>c.played),before.map(n=>n+1));
 assert.equal(partyReady(s,NOW),undefined,'held; the next chapter is not ready');
 assert.deepEqual(validateSave(JSON.parse(JSON.stringify(s))).islandParties,{0:NOW});
 assert.equal(validParties({9:1}),false);assert.equal(validParties({0:'x'}),false);assert.equal(validParties([]),false);
});

test('after the whole path one old party comes round each week, in turn, and not twice in a week',()=>{
 const s=fixture();learn(s,24);use(s,24);
 for(let c=0;c<LEARNING_CHAPTERS.length;c++){assert.equal(partyReady(s,NOW)!.chapter,c,'first parties in path order');finishParty(s,c,NOW);}
 assert.equal(partyReady(s,NOW+DAY),undefined,'everything was just held');
 const later=NOW+PARTY_WEEK,turn=Math.floor(later/PARTY_WEEK)%LEARNING_CHAPTERS.length;
 assert.equal(partyReady(s,later)!.chapter,turn);
 finishParty(s,turn,later);
 assert.equal(partyReady(s,later+DAY),undefined,'this week\'s party is done');
 assert.equal(partyReady(s,later+PARTY_WEEK)!.chapter,(turn+1)%LEARNING_CHAPTERS.length,'next week, the next chapter');
});

test('from the fifth chapter the last round with things combines a learned colour and a thing; earlier it never does',()=>{
 const s=fixture();learn(s,COMBO_FROM-1);
 const tidy=playById('tidy')!;
 assert.equal(comboReady(s,tidy),false);
 for(let r=0;r<ROUNDS;r++)assert.equal(playAsk(s,tidy,'a',r)!.also,undefined);
 learn(s,COMBO_FROM);assert.equal(lessonsDone(s),COMBO_FROM);
 assert.equal(comboReady(s,tidy),true);assert.equal(comboReady(s,playById('stage')!),false,'colours only');assert.equal(comboReady(s,playById('feelings')!),false,'sentences');
 for(const session of ['a','b','c']){
  for(let r=0;r<ROUNDS-1;r++)assert.equal(playAsk(s,tidy,session,r)!.also,undefined,'only the last round');
  const ask=playAsk(s,tidy,session,ROUNDS-1)!;
  assert.ok(ask.also?.css,'a colour');assert.equal(ask.prompt.kind,'word');assert.equal(ask.answer,`${ask.also!.key}|${ask.prompt.key}`);
  assert.equal(ask.options.length,4);assert.equal(new Set(ask.options.map(o=>o.id)).size,4);
  assert.equal(ask.options.filter(o=>o.id===ask.answer).length,1);
  // Following only the colour or only the thing leaves two pictures: both words are needed.
  assert.equal(ask.options.filter(o=>o.id.startsWith(`${ask.also!.key}|`)).length,2);assert.equal(ask.options.filter(o=>o.id.endsWith(`|${ask.prompt.key}`)).length,2);
  for(const o of ask.options){const [c,t]=o.id.split('|');assert.ok(s.learning!.units&&learningEntry(c)!.css===o.tint);assert.ok(tidy.pool.includes(t));}
 }
});

test('the child gives the instruction only in the last chapter, with learned sentences the friend has an answer for',()=>{
 const s=fixture();learn(s,19);
 const lead=PLAYS.find(p=>p.kind==='lead')!;
 assert.ok(!playsAt(s,lead.place).some(p=>p.id===lead.id),'not before the sixth chapter');
 learn(s,20);
 assert.ok(playsAt(s,lead.place).some(p=>p.id===lead.id));
 const items=freeItems(s,lead,'x',NOW);assert.ok(items.length>=2);
 for(const k of lead.pool){assert.equal(learningEntry(k)!.kind,'phrase');assert.ok(LEAD_REACTIONS[k],k);}
 for(const k of items)assert.ok(LEARNING_UNITS.slice(0,20).some(u=>u.phrase===k),`${k} is learned`);
});

test('a combined instruction is one natural phrase, and every one the island can give is in the recorded list',()=>{
 assert.equal(comboLine('red','ball'),'a red ball');assert.equal(comboLine('orange','hat'),'an orange hat');
 assert.equal(comboLine('blue','water'),'blue water');assert.equal(comboLine('purple','grapes'),'purple grapes');assert.equal(comboLine('green','milk'),'green milk');
 const lines=new Set(comboLines());assert.equal(lines.size,comboLines().length,'no duplicates');
 const voiced=new Set((JSON.parse(readFileSync('voice/lines.json','utf8')) as {lang:string;text:string}[]).filter(l=>l.lang==='en').map(l=>l.text));
 for(const l of lines)assert.ok(voiced.has(l),`recorded: ${l}`);
 const s=fixture();learn(s,24);
 for(const p of [...PLAYS,...OWN_SPECIES.map(x=>ownPlay(s,x)!)].filter(p=>comboReady(s,p)))for(const session of ['a','b','c','d','e','f']){
  const ask=playAsk(s,p,session,ROUNDS-1)!;
  if(ask.also)assert.ok(lines.has(comboLine(ask.also.key,ask.prompt.key)),`${p.id}: ${ask.also.key} ${ask.prompt.key}`);
 }
});
