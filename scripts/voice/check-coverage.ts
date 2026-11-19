import { allStoryEditions } from '../../src/data/storyLevels';
import {WEATHER,CLEAR_NIGHT} from '../../src/lib/weather';
import {GUIDES} from '../../src/data/onboarding';
import { DIARY_PROMPTS } from '../../src/data/diaryPrompts';
import { EXTRA_LEARNING } from '../../src/data/learningLexicon';
/** Exercise actual cross-choice feedback and island narration, not only self-pairs. */
import { readFileSync } from 'node:fs';
import { CREATURES } from '../../src/data/creatures';
import { STORIES } from '../../src/data/stories';
import { LEARNING_UNITS,unitSituations,learningEntry } from '../../src/data/curriculum';
import { learningVoice,learningExplanation } from '../../src/lib/learningVoice';
import { PIC_WORDS, PHRASES, LETTERS } from '../../src/data/words';
import { nameNo, picNo, feedbackParts, traceIntro, traceSuccess } from '../../src/data/taskEnglish';
import { facilityLesson } from '../../src/data/learning';
import { PLACES as STATIONS } from '../../src/island/world';
import { lookLine, whatLine, whereLine } from '../../src/data/islandEnglish';
import { ACTIVITY } from '../../src/lib/routine';
import type { Part } from '../../src/lib/speech';
import { storyLineWords, storyWordVoice } from '../../src/lib/storyWords';
import { voiceKey } from '../../src/lib/voiceKey';
const lines = JSON.parse(readFileSync('voice/lines.json','utf8')) as {lang:string;text:string;key?:string;timed?:boolean}[];
const keys = new Set(lines.map(l=>l.key??`${l.lang}|${l.text}`));
const timed = new Set(lines.filter(l=>l.timed).map(l=>l.key??`${l.lang}|${l.text}`));
const missing = new Set<string>();
let checked = 0;
const check = (lang:string,text:string) => { checked++;if(!keys.has(`${lang}|${text}`))missing.add(`${lang}|${text}`); };
const parts = (ps:Part[]) => ps.forEach(p=>{if(typeof p!=='number')check(p[0],p[1]);});
for(const w of [...Object.values(WEATHER),CLEAR_NIGHT]){check('en',w.en);check('zh',w.voice);}
for(const guide of Object.values(GUIDES))check('zh',guide.voice);
for(const prompt of DIARY_PROMPTS)check('zh',prompt.voice);
for(const actual of CREATURES)for(const target of CREATURES)parts(feedbackParts(nameNo(actual,target),true));
for(const actual of PIC_WORDS)for(const target of PIC_WORDS)parts(feedbackParts(picNo(actual,target),true));
for(const station of STATIONS){
 for(const level of [1,2] as const){const l=facilityLesson(station,level);check('en',l.en);check('zh',l.zh);}
 for(const p of CREATURES){
  const a=station.activity,A=ACTIVITY[a];
  for(const n of [lookLine(p,a),whereLine(p,a),whatLine(p,a)]){
   n.en.forEach(t=>check('en',t));check('zh',n.zh);if(n.echo)check('en',n.echo);if(n.me)check('en',n.me);
  }
  check('en',`${p.nameEn} ${A.en}.`);check('zh',`${p.nameZh}${A.zh}。`);
 }
}
for(const key of [...PIC_WORDS.map(w=>w.en),...PHRASES.map(p=>p.en),...CREATURES.map(p=>p.nameEn),'big','small',...Array.from({length:5},(_,i)=>`count:${i+1}`)]){
 const entry=learningEntry(key);if(entry)parts(learningExplanation(entry));
}
for(const entry of EXTRA_LEARNING)parts(learningVoice(entry));
for(const p of PHRASES){check('en',p.en);check('zh',p.zh);}
for(const unit of LEARNING_UNITS){check('zh',unit.mission);for(const scene of unitSituations(unit)){check('zh',scene.situation);for(const key of [scene.phrase,scene.alternative])parts(learningVoice(learningEntry(key)!));}for(const key of unit.words)parts(learningVoice(learningEntry(key)!));}
for(const key of ['big','small','count:1','count:2','count:3','count:4','count:5'])parts(learningVoice(learningEntry(key)!));
for(const item of [...LETTERS,...PIC_WORDS.filter(w=>w.icon).map(w=>({...w,letter:w.en[0].toUpperCase()}))]){parts(traceIntro(item));parts(traceSuccess(item));}
for(const story of allStoryEditions(STORIES))for(const line of [...story.pages,...story.pages.flatMap(p=>p.pictureWord?[p.pictureWord]:[]),story.phrase,story.question,...story.pages.flatMap(p=>p.pause?.choices.map(c=>c.reply)??[])]){check('en',line.en);check('zh',line.zh);}
// Read-along pages need both paces with word timings, and every word on its own.
for(const story of allStoryEditions(STORIES))for(const page of story.pages){
 for(const key of [voiceKey('en',page.en),voiceKey('en',page.en,'slow')]){checked++;if(!keys.has(key)||!timed.has(key))missing.add(`timed:${key}`);}
 for(const word of storyLineWords(page.en))check('en',storyWordVoice(word));
}
console.log(JSON.stringify({checked,missing:[...missing],passed:missing.size===0},null,2));
if(missing.size)process.exit(1);
