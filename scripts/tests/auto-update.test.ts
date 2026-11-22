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

test('back after a long break, the release opens on any settled screen, but only in the first minute',async()=>{
 const {AWAY_MS,RESUME_WINDOW_MS,freshStart}=await import('../../src/lib/autoUpdate');
 assert.equal(freshStart(AWAY_MS-1),false);assert.equal(freshStart(AWAY_MS),true);
 let now=0,settled=true;const {st,env}=fakeEnv({now:()=>now});
 const u=createAutoUpdate({isSafe:()=>false,isSettled:()=>settled,beforeOpen:async()=>{},env});
 await u.check();assert.equal(st.opened,0,'on the island, mid-play: waits');
 u.resume(5*60*1000);await u.open();assert.equal(st.opened,0,'a short break is not a fresh start');
 u.resume(AWAY_MS);settled=false;await u.open();assert.equal(st.opened,0,'not while saving');
 now=RESUME_WINDOW_MS+1;settled=true;await u.open();assert.equal(st.opened,0,'the fresh-start minute has passed');
 u.resume(AWAY_MS+1);await u.open();assert.equal(st.opened,1,'back after a long break: opens wherever the child is');
});
test('without a settled check, a long break changes nothing (quiet moments only)',async()=>{
 const {AWAY_MS}=await import('../../src/lib/autoUpdate');
 const {st,env}=fakeEnv();
 const u=createAutoUpdate({isSafe:()=>false,beforeOpen:async()=>{},env});
 await u.check();u.resume(AWAY_MS);await u.open();assert.equal(st.opened,0);
});
test('browse-only screens count as quiet moments, and forced or failed checks do not wait a full cooldown',async()=>{
 const {RETRY_AFTER_ERROR_MS}=await import('../../src/lib/autoUpdate');
 for(const name of ['stories','notebook','dexDetail'])assert.equal(quietMoment({...base,screen:{name}}),true,name);
 let now=1000,calls=0,fail=true;
 const {st,env}=fakeEnv({now:()=>now,check:async()=>{calls++;if(fail)throw new Error('offline');return {id:'C',changed:calls>=3};}});
 const u=createAutoUpdate({isSafe:()=>true,beforeOpen:async()=>{},env});
 await u.check();assert.equal(calls,1);assert.equal(st.opened,0);
 now+=RETRY_AFTER_ERROR_MS-1;await u.check();assert.equal(calls,1,'still within error backoff');
 fail=false;now+=1;await u.check();assert.equal(calls,2,'retries after short error backoff');
 await u.check();assert.equal(calls,2,'regular check respects cooldown');
 await u.check(true);assert.equal(calls,3,'forced check bypasses cooldown on SW activation or return');
 assert.equal(st.opened,1);
});
