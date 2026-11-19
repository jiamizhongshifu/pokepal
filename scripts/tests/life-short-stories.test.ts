import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {STORIES,storyProgressKey} from '../../src/data/stories';
import {LIFE_SHORT_STORIES} from '../../src/data/lifeShortStories';
import {STORY_SCENES} from '../../src/data/storyScenes';
import {LEARNING_UNITS,learningEntry} from '../../src/data/curriculum';
import {togetherSession} from '../../src/island/together';
import {storyProp} from '../../src/data/sceneArt';

test('every short story has bilingual pages, matching art assets and reusable learning words',()=>{
 for(const story of LIFE_SHORT_STORIES){
  assert.equal(STORIES.filter(s=>s.id===story.id).length,1);
  assert(LEARNING_UNITS.some(u=>u.story===story.id),'story has a relevant lesson');
  assert(story.activity,'story returns to a real activity');
  assert.equal(STORY_SCENES[story.id].length,story.pages.length);
  assert(learningEntry(story.phrase.en));
  for(const [i,p] of story.pages.entries()){
   assert(p.zh.trim()&&p.en.trim());assert(p.en.toLowerCase().includes(p.keyword.en.toLowerCase()));
   assert(story.cast.includes(p.speaker));assert(learningEntry(p.keyword.en));
   for(const item of STORY_SCENES[story.id][i].items)assert(existsSync(`public${storyProp(item.kind)}`),item.kind);
  }
 }
 assert.equal(new Set(STORIES.map(storyProgressKey)).size,STORIES.length);
});
test('switching play to rest retains partners and releases old reservation identities',()=>{
 const play=togetherSession('ball',[1001,1011]);const rest=togetherSession('rest',play.partners,play.context==='coast');
 assert.deepEqual(rest.partners,play.partners);assert.notEqual(rest.id,play.id);
 for(const [i,v] of rest.visits.entries()){
  assert.equal(v.station.activity,'nap');
  assert.notEqual(v.key,play.visits[i].key);
 }
});
