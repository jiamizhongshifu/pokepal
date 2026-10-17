import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../src/types';
import {migrateParticipation,rewardParticipation,PARTICIPATION_KINDS} from '../src/lib/participation';
import {migrateLearning,attempt,encounter,applyStation,progressUnit} from '../src/lib/learningProgress';
import {learningEntry,learningLevel,LEARNING_UNITS,unitRoundCount,selectedUnit} from '../src/data/curriculum';
import {dailyLearningPlan,facilityLesson} from '../src/data/learning';
import {STORIES} from '../src/data/stories';
import {STATIONS} from '../src/scene/islandLife';
import {EXTRA_LEARNING} from '../src/data/learningLexicon';
import {learningVoice} from '../src/lib/learningVoice';
import {validateSave} from '../src/lib/saveValidation';
const fresh=():SaveData=>({version:1,trainer:null,energy:0,balls:{poke:1,great:0,ultra:0,master:0},captures:[],daily:{date:'2026-10-16',energyEarned:0,board:['listen','wordpic','repeat','trace'],boardDone:[false,false,false,false],bonusGiven:false,tasksCompleted:0,heard:0,spoken:0,words:[],caught:[],playSeconds:0,extraSeconds:0},streak:{lastDate:'',count:0},wordStats:{},settings:{dailyMinutes:15,tasksPerDay:4,level:1,favorites:[25],speechRate:1},history:[]});
const s=fresh();
for(const kind of ['course','story','review'] as const)rewardParticipation(s,kind);
assert.equal(s.energy,7);assert.equal(s.participation?.days,1);assert(s.daily.goalDone);
for(let i=0;i<20;i++)for(const kind of ['course','story','review'] as const)assert.equal(rewardParticipation(s,kind).gained,0);
assert.equal(s.energy,7);assert.equal(s.balls.master,0);
for(const kind of PARTICIPATION_KINDS)rewardParticipation(s,kind);
assert.equal(s.energy,15);assert.equal(s.daily.energyEarned,15);assert.equal(s.participation?.days,1);
for(let day=1;day<=6;day++){
 // Gaps and month changes do not erase earned participation days.
 s.daily={...fresh().daily,date:`2026-11-${String(day*3).padStart(2,'0')}`};
 for(const kind of ['listen','wordpic','island'] as const)rewardParticipation(s,kind);
}
assert.equal(s.participation?.days,7);assert.equal(s.balls.poke,2);assert.equal(s.balls.master,0);
for(const kind of PARTICIPATION_KINDS)rewardParticipation(s,kind);
assert.equal(s.balls.poke,2,'gift replay never duplicates');
assert.doesNotThrow(()=>validateSave(s));
const legacy=fresh();legacy.streak={lastDate:legacy.daily.date,count:6};legacy.daily.bonusGiven=true;legacy.daily.boardDone=[true,true,true,true];legacy.balls.master=2;
migrateParticipation(legacy);const stable=structuredClone(legacy);migrateParticipation(legacy);assert.deepEqual(legacy,stable);
rewardParticipation(legacy,'story');assert.equal(legacy.participation?.days,6);assert.equal(legacy.balls.master,2,'no retroactive payout');
legacy.daily={...fresh().daily,date:'2026-12-01'};
for(const kind of ['course','story','review'] as const)rewardParticipation(legacy,kind);
assert.equal(legacy.balls.master,2);assert.equal(legacy.balls.poke,2);assert.equal(legacy.participation?.days,7);
for(const mutate of [(s:SaveData)=>s.daily.participated=['story','story'],(s:SaveData)=>s.daily.storyReadPages={x:[1,1]},(s:SaveData)=>s.participation={version:1,days:0,lastDate:'',gifts:2}]){const invalid=fresh();mutate(invalid);assert.throws(()=>validateSave(invalid));}
const journey=fresh();migrateLearning(journey);
for(let i=0;i<LEARNING_UNITS.length;i++){
 const u=LEARNING_UNITS[i];progressUnit(journey,u.id,unitRoundCount(u));
 assert.equal(learningLevel(journey),1,'parent readiness applies in every chapter');
 assert.equal(selectedUnit(journey).id,u.id,'retain the just-completed theme for optional island and story encounters');
 const p=dailyLearningPlan(journey);assert.equal(p.words.length,3);assert.equal(p.phrases.length,3);
 assert([...p.words,...p.phrases].every(w=>w.level<=journey.settings.level));
}
attempt(journey,'apple',false,false,'test',1);assert.equal(dailyLearningPlan(journey,false,2).words[0].en,'apple');
const evidence=fresh();migrateLearning(evidence);
encounter(evidence,'Tree!','island',1);encounter(evidence,'tree','story',2);assert.equal(Object.keys(evidence.learning!.records).length,1);
attempt(evidence,'tree',true,true,'hint',3);assert.equal(evidence.learning!.records.tree.independent,0);assert.equal(evidence.learning!.records.tree.supported,1);
evidence.learning!.activeUnit='sorry-and-repair';evidence.learning!.units['sorry-and-repair']={round:5,completedAt:1};
applyStation(evidence,'farm',4,'Water!',true);assert.equal(evidence.learning!.records['Sorry.'],undefined);assert.equal(evidence.learning!.records.water.actions,1);assert.equal(evidence.learning!.records.water.independent,0);
const old=evidence.learning!.records.tree;delete old.evidenceVersion;old.independent=10;old.streak=4;
migrateLearning(evidence);assert.equal(old.independent,0);assert.equal(old.legacyIndependent,10);assert.equal(old.streak,0);
const migrated=structuredClone(evidence);migrateLearning(evidence);assert.deepEqual(evidence,migrated);assert.doesNotThrow(()=>validateSave(evidence));
for(const story of STORIES){assert(learningEntry(story.phrase.en));for(const page of story.pages)assert(learningEntry(page.keyword.en),page.keyword.en);}
for(const station of STATIONS)for(const level of [1,2] as const)assert(learningEntry(facilityLesson(station,level).en));
const manifest=JSON.parse(readFileSync('public/voice/manifest.json','utf8'));
for(const entry of EXTRA_LEARNING)for(const line of learningVoice(entry))if(typeof line!=='number')assert(manifest[`${line[0]}|${line[1]}`],`bundled voice: ${line[1]}`);
for(const n of [2,3])assert(manifest[`zh|你得到了${n}点能量！`]);
console.log(`PASS: category deduplication, daily cap, optional speech/writing paths, nonconsecutive milestones, migration, evidence separation, all 24 beginner chapters, all ${STORIES.reduce((n,s)=>n+s.pages.length,0)} story keywords and ${EXTRA_LEARNING.length} expression recordings.`);
