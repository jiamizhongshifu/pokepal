import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {progressUnit} from '../../src/lib/learningProgress';
import {learningPath,withReview,withWelcomeFriend} from '../../src/lib/learningPath';
import {sceneSpots,leftBehind,bubblePictures,LESSON_SPOTS} from '../../src/lib/pathScene';
import {validateSave} from '../../src/lib/saveValidation';
import {ICON_ASSETS as ICONS} from '../../src/icons/generated';

const fixture=()=>{const s=validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];s.learning!.records={};return s;};
const learn=(s:SaveData,n:number)=>{for(const u of LEARNING_UNITS.slice(0,n))progressUnit(s,u.id,unitRoundCount(u),100);};

test('every stop of every chapter has its own place in the scene, lessons on the four clearings in order',()=>{
 for(const n of [0,5,LEARNING_UNITS.length]){
  const s=fixture();learn(s,n);
  for(const chapter of withWelcomeFriend(s,withReview(s,learningPath(s)))){
   const spots=sceneSpots(chapter.nodes);
   assert.equal(spots.length,chapter.nodes.length);
   assert.equal(new Set(spots.map(p=>p.join())).size,spots.length,`chapter ${chapter.index}: no two stops on one place`);
   for(const [x,y] of spots)assert.ok(x>4&&x<96&&y>12&&y<92,'inside the picture');
   assert.deepEqual(chapter.nodes.flatMap((node,i)=>node.kind==='lesson'?[spots[i]]:[]),LESSON_SPOTS.slice(0,chapter.nodes.filter(x=>x.kind==='lesson').length));
  }
 }
});

test('what a stop shows is always a picture that exists',()=>{
 const s=fixture();learn(s,LEARNING_UNITS.length);
 const icons=ICONS as Record<string,string>;
 for(const node of learningPath(s).flatMap(c=>c.nodes)){
  assert.ok(icons[leftBehind(node)],`${node.key}: ${leftBehind(node)}`);
  const pictures=bubblePictures(node);
  assert.ok(pictures.length>=1&&pictures.length<=2,node.key);
  for(const p of pictures)assert.ok(icons[p],`${node.key}: ${p}`);
 }
});

import {existsSync} from 'node:fs';
import {LEARNING_CHAPTERS} from '../../src/data/curriculum';
import {PATH_ART,pathArt} from '../../src/data/sceneArt';
test('every chapter of the path has its own painting, listed in the art catalogue as a repeat of the first one\'s layout',()=>{
 assert.equal(PATH_ART.length,LEARNING_CHAPTERS.length);assert.equal(new Set(PATH_ART).size,PATH_ART.length);
 const catalogue=JSON.parse(readFileSync('scripts/art/scenes.json','utf8')).scenes as {id:string;group:string;layoutOf?:string}[];
 PATH_ART.forEach((id,i)=>{
  const entry=catalogue.find(x=>x.id===id);
  assert.equal(entry?.group,'world',id);assert.equal(entry!.layoutOf,i?PATH_ART[0]:undefined,id);
  assert.ok(existsSync(`public${pathArt(i)}`),id);
 });
});

import {reviewScene,unitSituations} from '../../src/data/curriculum';
import {storyBackground} from '../../src/data/sceneArt';
test('a word comes back in the scene of the lesson it was last practised in, else its own lesson\'s',()=>{
 for(const u of LEARNING_UNITS)for(const key of [...u.words,...unitSituations(u).map(x=>x.phrase)]){
  const scene=reviewScene(key);assert.ok(existsSync(`public${storyBackground(scene)}`),`${key}: ${scene}`);
 }
 const [a,b]=[LEARNING_UNITS[0],LEARNING_UNITS.find(u=>u.scene!==LEARNING_UNITS[0].scene&&u.words.includes(LEARNING_UNITS[0].words[0]))];
 if(b)assert.equal(reviewScene(a.words[0],[`unit:${a.id}`,`unit:${b.id}`]),b.scene);
 assert.equal(reviewScene('not-a-word'),'meadow');
});
