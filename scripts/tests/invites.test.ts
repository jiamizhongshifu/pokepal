import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSave} from '../../src/lib/saveValidation';
import {invitePartner} from '../../src/lib/invites';
import {claimChapterFriend} from '../../src/lib/learningPath';
import {rewardParticipation} from '../../src/lib/participation';
import {CREATURES} from '../../src/data/creatures';
const grown=CREATURES.find(c=>c.isFinal)!.id;
import type {SaveData} from '../../src/types';
const make=():SaveData=>JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8'));
test('legacy inventory merges once on load/import, preserves records and original backup',()=>{
 const old=make();old.balls={poke:2,great:3,ultra:4,master:5};old.captures[0].ball='master';
 const copy=structuredClone(old);const s=validateSave(old);
 assert.deepEqual(s.balls,{poke:14,great:0,ultra:0,master:0});
 assert.deepEqual(validateSave(s).balls,s.balls);assert.deepEqual(old,copy);
 assert.deepEqual(s.captures,old.captures);assert.equal(s.energy,0,'energy is retired into berries');
});
test('reject negative or overflowing legacy inventory instead of losing balls',()=>{
 const s=make();s.balls.great=-1;assert.throws(()=>validateSave(s));
 s.balls={poke:Number.MAX_SAFE_INTEGER,great:1,ultra:0,master:0};assert.throws(()=>validateSave(s));
});
test('one ball captures every catalog entry including evolution-only and legendary, replay cannot spend twice',()=>{
 for(const p of CREATURES){const s=make();s.captures=[];s.daily.caught=[];s.dex=[];s.catchWish=p.id;s.balls={poke:2,great:0,ultra:0,master:0};
 assert.equal(invitePartner(s,p.id),true,p.nameEn);assert.equal(s.balls.poke,1);assert.equal(s.catchWish,undefined);assert.ok(s.dex!.includes(p.id));
 assert.equal(invitePartner(s,p.id),false);assert.equal(s.balls.poke,1);assert.equal(s.captures.length,1);assert.deepEqual(s.daily.caught,[p.id]);
 }
});
test('empty inventory and invalid targets never create a companion or consume a ball',()=>{
 const s=make();s.captures=[];s.balls={poke:0,great:0,ultra:0,master:0};assert.equal(invitePartner(s,grown),false);
 s.balls.poke=1;assert.equal(invitePartner(s,-1),false);assert.equal(s.balls.poke,1);assert.equal(s.captures.length,0);
});
test('a friend-stop berry allows an immediate invite of a chosen grown creature',()=>{
 const s=make();s.captures=[];s.balls={poke:0,great:0,ultra:0,master:0};
 assert.equal(claimChapterFriend(s,0),true);assert.equal(s.balls.poke,1);assert.equal(invitePartner(s,grown),true);assert.equal(s.balls.poke,0);
 assert.equal(s.path!.friends['0'],grown);assert.equal(claimChapterFriend(s,0),false);assert.equal(s.balls.poke,0);
});
test('seventh participation day gives the same ball once',()=>{
 const s=make();s.balls={poke:0,great:0,ultra:0,master:0};s.participation={version:1,days:6,gifts:0,lastDate:'2020-01-01'};
 s.daily.participated=[];s.daily.goalDone=false;s.daily.energyEarned=0;
 rewardParticipation(s,'listen');rewardParticipation(s,'story');const r=rewardParticipation(s,'island');assert.equal(r.ballGranted,true);assert.deepEqual(s.balls,{poke:1,great:0,ultra:0,master:0});
 assert.equal(rewardParticipation(s,'island').ballGranted,false);assert.equal(s.balls.poke,1);assert.equal(validateSave(s).balls.poke,1);
});
