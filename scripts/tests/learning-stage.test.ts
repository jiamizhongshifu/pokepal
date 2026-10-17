import test from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING_STAGES,learningProfile,stageProfile,normalizeLearningSettings,applyLearningSettings,validLearningProfile,startsWithListening } from '../../src/lib/learningStage';
import { dailyLearningPlan } from '../../src/data/learning';
import { learningEntry,learningLevel,LEARNING_UNITS } from '../../src/data/curriculum';
import { learningChoices } from '../../src/lib/learningChoices';
import { recommendedReviewKeys,reviewGroupSize,encounter } from '../../src/lib/learningProgress';
import { validateSave } from '../../src/lib/saveValidation';
import type { SaveData,Settings } from '../../src/types';
const baseSettings=(level:1|2=1):Settings=>({dailyMinutes:15,tasksPerDay:4,level,favorites:[25],speechRate:1});
const fixture=():SaveData=>({version:1,trainer:{name:'小训练师',avatar:'avatar-red',createdAt:1},energy:7,balls:{poke:2,great:0,ultra:0,master:0},captures:[],settings:baseSettings(),daily:{date:'2026-10-16',board:['listen','wordpic','repeat','trace'],boardDone:[true,false,false,false],bonusGiven:false,energyEarned:2,tasksCompleted:1,heard:3,spoken:0,words:['apple'],caught:[],playSeconds:100,extraSeconds:0},wordStats:{apple:{heard:2,spoken:0,correct:1}},history:[],streak:{lastDate:'2026-10-16',count:1},learning:{version:1,activeUnit:'color-orchard',records:{},units:{'hello-island':{round:4,completedAt:1},'color-orchard':{round:1}}}});

test('legacy levels preserve existing participation and review defaults without mutating input',()=>{
 for(const level of [1,2] as const){const original=baseSettings(level),normalized=normalizeLearningSettings(original);assert.equal(original.learningProfile,undefined);assert.equal(normalized.level,level);assert.equal(normalized.learningProfile?.stage,level===1?'discover':'express');assert.equal(normalized.learningProfile?.review,level===1?2:3);}
});
test('presets differ in actual participation, vocabulary, choices and review behavior',()=>{
 const listen=stageProfile('listen'),discover=stageProfile('discover'),express=stageProfile('express');
 assert(startsWithListening(listen,'word'));assert(!startsWithListening(discover,'word'));
 assert(startsWithListening(discover,'phrase',2));assert(!startsWithListening(discover,'phrase',1));
 assert(!startsWithListening(express,'phrase',2));
 for(const stage of LEARNING_STAGES){const s=fixture();s.settings=applyLearningSettings(s.settings,{learningProfile:stage.profile});assert.equal(learningLevel(s),stage.profile.vocabulary);assert.equal(reviewGroupSize(s),stage.profile.review);assert.equal(learningChoices(learningEntry('ball')!,undefined,learningProfile(s.settings).choices,learningLevel(s)).length,stage.profile.choices);assert(dailyLearningPlan(s).words.every(w=>w.level<=stage.profile.vocabulary));}
});
test('custom advanced vocabulary can coexist with listening, two choices and a short review group',()=>{
 const s=fixture();s.learning!.activeUnit='apple-please';
 s.settings=applyLearningSettings(s.settings,{learningProfile:{...stageProfile('listen'),stage:'custom',vocabulary:2,phrases:'listen'}});
 assert.equal(s.settings.level,2);assert.equal(learningLevel(s),2);assert.equal(learningProfile(s.settings).choices,2);assert.equal(reviewGroupSize(s),2);
 assert(dailyLearningPlan(s).words.some(w=>w.en==='watermelon'));
 encounter(s,'watermelon','review',1);assert(recommendedReviewKeys(s,100000000).includes('watermelon'));
 assert(startsWithListening(learningProfile(s.settings),'phrase',2));
 const changed=applyLearningSettings(s.settings,{speechRate:.8});assert.deepEqual(changed.learningProfile,s.settings.learningProfile);
 const restored=applyLearningSettings(changed,{learningProfile:stageProfile('discover')});assert.equal(restored.level,1);assert.equal(restored.learningProfile?.stage,'discover');
 const legacy=applyLearningSettings(restored,{level:2});assert.equal(legacy.learningProfile?.stage,'express');
});
test('changing stages and JSON export/import preserve progress, words, rewards and settings',()=>{
 const s=fixture();encounter(s,'apple','review',1);const before=structuredClone(s);
 for(const stage of LEARNING_STAGES)s.settings=applyLearningSettings(s.settings,{learningProfile:stage.profile});
 s.settings=applyLearningSettings(s.settings,{learningProfile:{...stageProfile('discover'),stage:'custom',choices:3,review:2}});
 const restored=validateSave(JSON.parse(JSON.stringify(s)));restored.settings=normalizeLearningSettings(restored.settings);
 assert.deepEqual(restored,s);assert.deepEqual({...restored,settings:before.settings},before);
 assert.equal(LEARNING_UNITS.length,24);
});
test('malformed or unsupported imported stage configurations are rejected before replacing saves',()=>{
 const baseline=fixture();
 for(const patch of [{version:2},{stage:'reading'},{vocabulary:3},{entry:'test'},{phrases:'exam'},{choices:9},{review:20}]){
  const invalid={...stageProfile('listen'),...patch};assert(!validLearningProfile(invalid));
  const candidate=structuredClone(baseline);candidate.settings.learningProfile=invalid as any;
  assert.throws(()=>validateSave(candidate),/英语学习阶段/);assert.deepEqual(baseline,fixture());
 }
 // A preset's policy cannot silently drift through a mismatching imported field.
 assert.deepEqual(learningProfile({...baseSettings(),learningProfile:{...stageProfile('listen'),vocabulary:2}}),stageProfile('listen'));
});
