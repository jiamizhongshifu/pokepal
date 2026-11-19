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
