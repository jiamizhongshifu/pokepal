import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldOpen,shouldCheck,quietMoment,isUpdateEntry,RECHECK_MS} from '../../src/lib/autoUpdate';

const base={loaded:true,saveBusy:false,saveIssue:null,screen:{name:'home'},hasTrainer:true};
test('a new release opens only once per tab, and only at a quiet moment',()=>{
 assert.equal(shouldOpen({ready:'b',tried:null,safe:true}),true);
 assert.equal(shouldOpen({ready:'b',tried:'b',safe:true}),false,'never loops on the same release');
 assert.equal(shouldOpen({ready:'c',tried:'b',safe:true}),true,'a later release still opens');
 assert.equal(shouldOpen({ready:'b',tried:null,safe:false}),false);
 assert.equal(shouldOpen({tried:null,safe:true}),false);
});
test('quiet moments: the path, the album, a returning child\'s welcome; never mid-activity or with unsaved progress',()=>{
 assert.equal(quietMoment(base),true);
 assert.equal(quietMoment({...base,screen:{name:'dex'}}),true);
 assert.equal(quietMoment({...base,loaded:false}),true,'before the save is read nothing can be lost');
 for(const name of ['lesson','review','story','catch','task','diary','parent','practice'])assert.equal(quietMoment({...base,screen:{name}}),false,name);
 assert.equal(quietMoment({...base,screen:{name:'home',view:'island'}}),false,'island play may be in progress');
 assert.equal(quietMoment({...base,screen:{name:'home',station:'tent'}}),false);
 assert.equal(quietMoment({...base,screen:{name:'welcome'},hasTrainer:false}),false,'a new family setting up is not interrupted');
 assert.equal(quietMoment({...base,saveBusy:true}),false);
 assert.equal(quietMoment({...base,saveIssue:'write'}),false,'unsaved progress is never dropped');
});
test('rechecks are spaced out',()=>{
 assert.equal(shouldCheck(-Infinity,0),true);
 assert.equal(shouldCheck(0,RECHECK_MS-1),false);
 assert.equal(shouldCheck(0,RECHECK_MS),true);
});
test('the update entry is recognised with or without .html, and nothing else is',()=>{
 assert.ok(isUpdateEntry('/release-entry'));assert.ok(isUpdateEntry('/release-entry.html'));
 for(const p of ['/','/privacy/','/release.json','/release-recovery.html'])assert.equal(isUpdateEntry(p),false,p);
});

import {createAutoUpdate,type UpdateEnv} from '../../src/lib/autoUpdate';
const fakeEnv=(over:Partial<UpdateEnv>={})=>{const st={mark:null as string|null,opened:0,notes:[] as string[]};const env:UpdateEnv={check:async()=>({id:'B',changed:true}),read:()=>st.mark,write:id=>{st.mark=id;},note:n=>{st.notes.push(n);},hidden:()=>false,online:()=>true,now:()=>0,open:()=>{st.opened++;},...over};return {st,env};};
test('a failed save leaves the release waiting, and it opens at the next quiet moment',async()=>{
 const {st,env}=fakeEnv();let fail=true;
 const u=createAutoUpdate({isSafe:()=>true,beforeOpen:async()=>{if(fail)throw new Error('busy');},env});
 await u.check();assert.equal(st.opened,0);assert.equal(st.mark,null,'not marked as tried');assert.ok(st.notes.includes('save-failed'));
 fail=false;u.changed();await new Promise(r=>setTimeout(r,0));
 assert.equal(st.opened,1);assert.equal(st.mark,'B');
});
test('a moment that stops being quiet while saving does not use up the attempt',async()=>{
 const {st,env}=fakeEnv();let safe=true,first=true;
 const u=createAutoUpdate({isSafe:()=>safe,beforeOpen:async()=>{if(first){first=false;safe=false;}},env});
 await u.check();assert.equal(st.opened,0);assert.equal(st.mark,null);assert.ok(st.notes.includes('not-quiet'));
 safe=true;await u.open();assert.equal(st.opened,1);
});
test('the same release never opens twice in a tab, and a busy moment waits',async()=>{
 const {st,env}=fakeEnv();st.mark='B';
 const u=createAutoUpdate({isSafe:()=>true,beforeOpen:async()=>{},env});
 await u.check();assert.equal(st.opened,0);
 const b=fakeEnv();let safe=false;const w=createAutoUpdate({isSafe:()=>safe,beforeOpen:async()=>{},env:b.env});
 await w.check();assert.equal(b.st.opened,0);safe=true;w.changed();await new Promise(r=>setTimeout(r,0));assert.equal(b.st.opened,1);
});
