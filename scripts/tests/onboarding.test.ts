import test from 'node:test';
import assert from 'node:assert/strict';
import {validOnboarding,GUIDES,completeGuide,guideVoiceState,type Onboarding} from '../../src/data/onboarding';
import {readFileSync} from 'node:fs';

test('guide preferences reject corrupted imports and prototype keys',()=>{
 assert(validOnboarding({version:1,automatic:true,seen:{}}));
 assert(validOnboarding({version:1,automatic:false,seen:{tasks:true,catch:false}}));
 for(const bad of [null,[],{version:2,automatic:true,seen:{}},{version:1,automatic:'yes',seen:{}},{version:1,automatic:true,seen:[]},{version:1,automatic:true,seen:{tasks:1}},{version:1,automatic:true,seen:{toString:true}},{version:1,automatic:true,seen:{invalid:true}}])assert.equal(validOnboarding(bad),false);
});
test('operation success survives storage without inventing seen state or enabling automatic help',()=>{
 const s:{onboarding?:Onboarding}={onboarding:{version:1,automatic:false,seen:{lesson:true}}};
 assert.equal(s.onboarding!.completed?.lesson,undefined);
 completeGuide(s,'picnic');completeGuide(s,'picnic');
 assert.deepEqual(s.onboarding,{version:1,automatic:false,seen:{lesson:true},completed:{picnic:true}});
 assert(validOnboarding(JSON.parse(JSON.stringify(s.onboarding))));
 for(const completed of [null,[],{picnic:1},{toString:true},{unknown:true}])assert.equal(validOnboarding({...s.onboarding,completed}),false);
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

test('automatic help yields to foreground audio and expires rather than interrupting much later',()=>{
 assert.equal(guideVoiceState(899,899,true,false),'wait');
 assert.equal(guideVoiceState(900,900,true,false),'play');
 assert.equal(guideVoiceState(3000,900,true,true),'wait');
 assert.equal(guideVoiceState(7999,899,true,false),'wait');
 assert.equal(guideVoiceState(8000,900,true,false),'drop');
 assert.equal(guideVoiceState(8000,0,true,true),'drop');
 assert.equal(guideVoiceState(1000,1000,false,false),'drop');
});
