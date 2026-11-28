import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {STORIES,storyProgressKey} from '../../src/data/stories';
import {LIFE_SHORT_STORIES} from '../../src/data/lifeShortStories';
import {STORY_SCENES} from '../../src/data/storyScenes';
import {LEARNING_UNITS,learningEntry} from '../../src/data/curriculum';
import {placeById} from '../../src/island/world';
import {storyProp} from '../../src/data/sceneArt';

test('media: every short story has bilingual pages, matching art assets and reusable learning words',()=>{
 for(const story of LIFE_SHORT_STORIES){
  assert.equal(STORIES.filter(s=>s.id===story.id).length,1);
  assert(LEARNING_UNITS.some(u=>u.story===story.id),'story has a relevant lesson');
  assert(story.activity,'story returns to a real activity');
  assert(placeById(story.activity!.station),`${story.id}: its activity is a real island place`);
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
