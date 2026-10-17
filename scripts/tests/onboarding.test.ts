import test from 'node:test';
import assert from 'node:assert/strict';
import {validOnboarding,GUIDES} from '../../src/data/onboarding';
import {readFileSync} from 'node:fs';

test('guide preferences reject corrupted imports and prototype keys',()=>{
 assert(validOnboarding({version:1,automatic:true,seen:{}}));
 assert(validOnboarding({version:1,automatic:false,seen:{tasks:true,catch:false}}));
 for(const bad of [null,[],{version:2,automatic:true,seen:{}},{version:1,automatic:'yes',seen:{}},{version:1,automatic:true,seen:[]},{version:1,automatic:true,seen:{tasks:1}},{version:1,automatic:true,seen:{toString:true}},{version:1,automatic:true,seen:{invalid:true}}])assert.equal(validOnboarding(bad),false);
});
test('every guide uses an existing icon and a generated Volcengine voice asset',()=>{
 const manifest=JSON.parse(readFileSync('public/voice/manifest.json','utf8'));
 const icons=readFileSync('src/icons/generated.ts','utf8');
 for(const [id,g] of Object.entries(GUIDES)){
  for(const icon of [g.icon,...('sequence' in g?g.sequence:[])])assert(icons.includes(`"${icon}":`),`${id} icon ${icon}`);
  const file=manifest[`zh|${g.voice}`];assert(file,`${id}: missing voice`);
  assert(readFileSync(`public/voice/${file}`).length>1000,`${id}: invalid audio`);
 }
});
test('learning guidance points at the whole choice group, never suggests an answer',()=>{
 assert.equal(GUIDES.listen.target,'.task-listen .choices');
 assert.equal(GUIDES.wordpic.target,'.task-wordpic .choices');
 assert.equal(GUIDES.lesson.target,'.learning-choices, .guided-example');
 assert.equal(GUIDES.review.target,'.learning-choices, .guided-example');
});
