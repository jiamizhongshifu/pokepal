import test from 'node:test';
import assert from 'node:assert/strict';
import {hasReadParentNotice,recordParentNotice,clearParentNotice,PARENT_NOTICE_KEY} from '../../src/lib/parentNotice';
import {feedbackEnvironment,makeFeedbackReport} from '../../src/lib/parentFeedback';

test('notice accepts only current local acknowledgement and can be withdrawn without touching game data',()=>{
  const data=new Map([['game-progress','keep'],[PARENT_NOTICE_KEY,'broken json']]);
  const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
  assert.equal(hasReadParentNotice(storage),false);
  storage.setItem(PARENT_NOTICE_KEY,JSON.stringify({version:'old'}));
  assert.equal(hasReadParentNotice(storage),false);
  assert.equal(recordParentNotice(storage),true);
  assert.equal(hasReadParentNotice(storage),true);
  clearParentNotice(storage);
  assert.equal(hasReadParentNotice(storage),false);
  assert.equal(data.get('game-progress'),'keep');
});
test('blocked browser storage cannot silently count as persistent notice acceptance',()=>{
  const fail=()=>{throw new Error('denied');};
  const storage={getItem:fail,setItem:fail,removeItem:fail};
  assert.equal(hasReadParentNotice(storage),false);
  assert.equal(recordParentNotice(storage),false);
  assert.doesNotThrow(()=>clearParentNotice(storage));
});
test('feedback permits only coarse opt-in environment and does not serialize unrelated data',()=>{
  const environment=feedbackEnvironment('Mozilla/5.0 SecretDevice ChildName Chrome/142.18.4321.987 private.example/secret',390,true);
  assert.deepEqual(environment,{browser:'Chrome 142',screen:'小屏',network:'浏览器报告联网'});
  const input={version:'2026-test',mode:'online',topic:'声音与配音',details:'点一下后没有声音',save:{name:'PRIVATE_CHILD'},audio:'PRIVATE_AUDIO',token:'PRIVATE_TOKEN',environment};
  const report=makeFeedbackReport(input);
  assert.ok(report.includes('Chrome 142'));
  for(const privateValue of ['SecretDevice','ChildName','142.18','PRIVATE_CHILD','PRIVATE_AUDIO','PRIVATE_TOKEN','private.example'])assert.ok(!report.includes(privateValue));
  const noDevice=makeFeedbackReport({...input,environment:undefined});
  assert.ok(!noDevice.includes('Chrome 142'));
  assert.ok(!noDevice.includes('屏幕：'));
});
