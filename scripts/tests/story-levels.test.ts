import test from 'node:test';
import assert from 'node:assert/strict';
import {STORIES,storyProgressKey} from '../../src/data/stories';
import {STORY_SCENES} from '../../src/data/storyScenes';
import {SHORT_STORY_LINES,storyEdition,storyLanguage,storyBookmarkKey,storyInitialPage} from '../../src/data/storyLevels';
import {stageProfile} from '../../src/lib/learningStage';
import type {Settings} from '../../src/types';
const settings=(stage:'listen'|'discover'|'express'):Settings=>({dailyMinutes:15,tasksPerDay:4,level:1,favorites:[],speechRate:1,learningProfile:stageProfile(stage)});

test('both adapted books retain all scenes, actors, choices and emotional beats',()=>{
 for(const id of Object.keys(SHORT_STORY_LINES)){
  const original=STORIES.find(s=>s.id===id)!;const short=storyEdition(original,'short');
  assert.equal(short.id,original.id);assert.equal(short.pages.length,original.pages.length);
  let words=0,originalWords=0;
  short.pages.forEach((p,i)=>{
   for(const k of ['speaker','pose','prop','beat','pause'] as const)assert.deepEqual(p[k],original.pages[i][k]);
   assert(p.en.trim()&&p.zh.trim());assert(p.en.toLowerCase().includes(p.keyword.en.toLowerCase()),p.en);
   assert(STORY_SCENES[id][i]);words+=p.en.split(/\s+/).length;originalWords+=original.pages[i].en.split(/\s+/).length;
  });
  assert(words<originalWords*.8);assert.equal(storyProgressKey(short),storyProgressKey(original));
 }
});
test('stage defaults, custom profiles and parent story override stay separate from page turn mode',()=>{
 const book=STORIES.find(s=>s.id==='taking-turns')!;
 assert.equal(storyLanguage(book,settings('listen')),'short');assert.equal(storyLanguage(book,settings('discover')),'short');assert.equal(storyLanguage(book,settings('express')),'full');
 assert.equal(storyLanguage(book,{...settings('express'),storyLanguage:'short',storyMode:'read'}),'short');
 assert.equal(storyLanguage(book,{...settings('listen'),storyLanguage:'full',storyMode:'listen'}),'full');
 assert.equal(storyLanguage(book,{...settings('express'),learningProfile:{...stageProfile('express'),stage:'custom',phrases:'listen'}}),'short');
 assert.equal(storyLanguage(STORIES.find(s=>s.id==='tell-truth')!,{...settings('listen'),storyLanguage:'short'}),'full');
});
test('legacy full bookmarks and reward identity remain stable while short bookmarks are independent',()=>{
 for(const id of Object.keys(SHORT_STORY_LINES)){
  const original=STORIES.find(s=>s.id===id)!;const short=storyEdition(original,'short');
  assert.equal(storyBookmarkKey(original,'full'),`${id}:edition-2`);
  assert.notEqual(storyBookmarkKey(short,'short'),storyBookmarkKey(original,'full'));
  const oldSave={[storyBookmarkKey(original,'full')]:6};assert.equal(storyInitialPage(original,oldSave[storyBookmarkKey(original,'full')]),5);assert.equal(storyInitialPage(short,oldSave[storyBookmarkKey(short,'short')]),0);
  assert.equal(storyProgressKey(original),storyProgressKey(short));
  for(const invalid of [undefined,NaN,-1,0,9,Infinity])assert.equal(storyInitialPage(original,invalid),0);
 }
});
test('picture listening targets correspond to real visible objects in every declared scene',()=>{
 for(const id of Object.keys(SHORT_STORY_LINES))for(const language of ['short','full'] as const){
  const story=storyEdition(STORIES.find(s=>s.id===id)!,language);
  for(const [i,p] of story.pages.entries())if(p.pictureWord)assert(STORY_SCENES[id][i].items.some(item=>item.kind===p.pictureWord!.kind),`${id}:${i+1}:${p.pictureWord.kind}`);
 }
});
