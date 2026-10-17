import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { attempt,encounter,migrateLearning,progressUnit,applyStation,reviewKeys } from '../src/lib/learningProgress';
import { LEARNING_UNITS,unitSituations,unitRoundCount,reviewSituation,learningEntry,unitUnlocked,selectedUnit } from '../src/data/curriculum';
import { STATIONS } from '../src/scene/islandLife';
import { STORIES } from '../src/data/stories';
import { learningTheme,themePhrases,themeWords } from '../src/data/learning';
import { learningChoices } from '../src/lib/learningChoices';
import { learningVoice } from '../src/lib/learningVoice';
import type { SaveData } from '../src/types';

const fixture=()=>({version:1,settings:{level:2},wordStats:{apple:{heard:4,correct:80,spoken:9}},captures:[{id:25,friendship:45}],energy:6} as unknown as SaveData);
const s=fixture();migrateLearning(s);
assert.equal(s.learning!.records.apple.streak,0,'legacy attempts must not invent spaced mastery');
assert.equal(s.captures[0].friendship,45);assert.equal(s.energy,6);
const day=Date.parse('2026-10-15T04:00:00Z');
attempt(s,'apple',false,false,'wordpic',day);
assert.equal(s.learning!.records.apple.needsPractice,true);
attempt(s,'apple',true,true,'wordpic',day+1000);
assert.equal(s.learning!.records.apple.independent,0,'hinted correction is not independent');
attempt(s,'apple',true,false,'review',day+2000);
attempt(s,'apple',true,false,'review',day+3000);
assert.equal(s.learning!.records.apple.streak,1,'same-day repeats must not advance interval');
assert.equal(s.learning!.records.apple.needsPractice,true);
assert.equal(reviewKeys(s,'due',day+4000).includes('apple'),false);
attempt(s,'apple',true,false,'review',day+86400000);
assert.equal(s.learning!.records.apple.streak,2);assert.equal(s.learning!.records.apple.needsPractice,false);
assert.equal(s.learning!.records.apple.nextReview,day+4*86400000);
encounter(s,'Hello!','repeat',day,true);assert.equal(s.learning!.records['Hello!'].streak,0,'voice activity is participation only');
assert.equal(unitUnlocked(s,LEARNING_UNITS[1].id),false);
progressUnit(s,LEARNING_UNITS[1].id,4);assert.equal(s.learning!.units[LEARNING_UNITS[1].id],undefined);
progressUnit(s,LEARNING_UNITS[0].id,2);assert.equal(s.learning!.units[LEARNING_UNITS[0].id].completedAt,undefined);
progressUnit(s,LEARNING_UNITS[0].id,4,day);assert.equal(unitUnlocked(s,LEARNING_UNITS[1].id),true);
applyStation(s,'flowers',day);assert.equal(s.learning!.units[LEARNING_UNITS[0].id].encounteredAt,undefined);
applyStation(s,'tent',day);assert.equal(s.learning!.units[LEARNING_UNITS[0].id].encounteredAt,day);
const recovered=JSON.parse(JSON.stringify(s));migrateLearning(recovered);assert.deepEqual(recovered,s,'round-trip preserves notebooks and progress');
// Extending the curriculum must preserve old completed stations and require both new scenarios.
const journey=fixture();migrateLearning(journey);
for(const unit of LEARNING_UNITS){
 assert(unitUnlocked(journey,unit.id),`sequential access: ${unit.id}`);
 const last=unitRoundCount(unit);
 progressUnit(journey,unit.id,last-1,day);
 assert.equal(journey.learning!.units[unit.id].completedAt,undefined,`premature completion: ${unit.id}`);
 const resumed=JSON.parse(JSON.stringify(journey));migrateLearning(resumed);
 assert.equal(resumed.learning.units[unit.id].round,last-1);
 progressUnit(journey,unit.id,last,day);
 assert(journey.learning!.units[unit.id].completedAt);
 const theme=learningTheme(journey);
 assert.equal(themeWords(theme,2,{}).length,3,`daily picture round: ${unit.id}`);
 assert(themePhrases(theme,2,{}).some(p=>p.en===selectedUnit(journey).phrase),`daily speaking: ${unit.id}`);
 assert(existsSync(`public/story-art/painted-v1/backgrounds/${unit.scene}.png`),unit.scene);
 for(const scene of unitSituations(unit)){
  const choices=learningChoices(learningEntry(scene.phrase)!,[scene.phrase,scene.alternative],3);
  assert.equal(choices.length,2);assert.equal(choices.filter(c=>c.key===learningEntry(scene.phrase)!.key).length,1);
  assert.equal(learningEntry(scene.alternative)?.kind,'phrase');
 }
}
assert.equal(LEARNING_UNITS.slice(0,12).every(u=>unitRoundCount(u)===4),true,'legacy completion threshold must stay four');
assert.equal(LEARNING_UNITS.slice(12).every(u=>unitRoundCount(u)===5),true,'new stations include a transfer scenario');
assert.equal(reviewSituation('Help, please!',['unit:sad-cloud','lesson'])?.situation,'你想把掉下来的花捡起来，但是够不到，需要帮助。');
assert.equal(reviewSituation('Thank you!',['unit:water-break'])?.situation,'伙伴递来了你想喝的水，你想感谢它。');
console.log(`PASS: ${LEARNING_UNITS.length} stations; sequential unlock, resume, transfer-round completion, daily tasks and unique scenario choices.`);
const manifest=JSON.parse(readFileSync('public/voice/manifest.json','utf8'));
for(const unit of LEARNING_UNITS){
 assert(STATIONS.some(s=>s.id===unit.station),unit.station);assert(STORIES.some(s=>s.id===unit.story),unit.story);
 assert.equal(new Set(unit.words).size,3);assert.notEqual(unit.phrase,unit.alternative);
 for(const key of [...unit.words,...unitSituations(unit).flatMap(s=>[s.phrase,s.alternative])]){const entry=learningEntry(key);assert(entry,key);for(const p of learningVoice(entry)){if(typeof p!=='number')assert(manifest[`${p[0]}|${p[1]}`],`${p[0]}|${p[1]}`);}}
 for(const scene of unitSituations(unit)){assert.notEqual(scene.phrase,scene.alternative);assert(manifest[`zh|${scene.situation}`]);}assert(manifest[`zh|${unit.mission}`]);
}
console.log('PASS: legacy migration, hinted correction, spaced review, voice participation, course unlock, station match, save round-trip and all curriculum units/voices.');
