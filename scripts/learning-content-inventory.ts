import { LEARNING_UNITS, LEARNING_CHAPTERS, unitSituations } from '../src/data/curriculum';
import { PHRASES, PIC_WORDS } from '../src/data/words';
import { STORIES } from '../src/data/stories';
import { EXTRA_LEARNING } from '../src/data/learningLexicon';
import { dailyLearningPlan } from '../src/data/learning';
import { readFileSync } from 'node:fs';
import type { SaveData } from '../src/types';
const save=JSON.parse(readFileSync('output/qa/island-living-20261016/test-save.json','utf8')) as SaveData;
const words=(s:string)=>s.trim().split(/\s+/).length;
const readiness=[];
for(const u of LEARNING_UNITS){save.settings.level=1;save.learning={version:1,activeUnit:u.id,records:{},units:{}};const p=dailyLearningPlan(save); readiness.push({unit:u.id,words:p.words.map(w=>w.en),phrases:p.phrases.map(w=>w.en),beyondReadiness:[...p.words,...p.phrases].filter(w=>w.level>1).map(w=>w.en)});}
console.log(JSON.stringify({chapters:LEARNING_CHAPTERS.length,units:LEARNING_UNITS.length,recognitionWords:PIC_WORDS.length,speakingPhrases:PHRASES.length,contextExpressions:EXTRA_LEARNING.length,unitDistinctWords:new Set(LEARNING_UNITS.flatMap(u=>u.words)).size,unitDistinctExpressions:new Set(LEARNING_UNITS.flatMap(u=>unitSituations(u).map(s=>s.phrase))).size,stories:STORIES.map(s=>({id:s.id,title:s.title,pages:s.pages.length,englishWordCounts:s.pages.map(p=>words(p.en)),maxSentenceWords:Math.max(...s.pages.flatMap(p=>p.en.split(/[.!?]+/).filter(s=>s.trim()).map(words))),optionalPauses:s.pages.filter(p=>p.pause).length})),readiness},null,2));
