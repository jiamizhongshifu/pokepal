import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneMusic,musicGain} from '../../src/lib/musicPolicy';
test('island follows all four sky periods; other rooms keep their own score',()=>{
 for(const sky of ['morning','day','evening','night'] as const){
  assert.equal(sceneMusic('home',sky),sky);
  assert.equal(sceneMusic('catch',sky),'meadow');
  assert.equal(sceneMusic('story',sky),'storybook');
  assert.equal(sceneMusic('dex',sky),'village');
 }
});
test('teaching, recording, parent tools and rest are always quiet',()=>{
 for(const screen of ['task','lesson','review','diary','parent','sleepy'])assert.equal(sceneMusic(screen,'day'),null);
 for(const screen of ['home','catch','stories','welcome'])assert.equal(sceneMusic(screen,'day',true),null);
});
test('foreground voice lowers music without changing the saved preference',()=>{
 for(const level of ['soft','normal'] as const){assert.ok(musicGain(level,true)<musicGain(level,false)*.2);assert.ok(musicGain(level,false)<.25);}
 assert.equal(musicGain('off',true),0);assert.equal(musicGain('off',false),0);
});
