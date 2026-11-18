import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSave} from '../../src/lib/saveValidation';
import {advanceAdventure,PICNIC_ADVENTURE} from '../../src/lib/storyAdventure';
import {restoreStory} from '../../src/lib/storyPlayer';
import {rewardParticipation} from '../../src/lib/participation';
import {exchangeInvite,invitePartner} from '../../src/lib/invites';
import type {SaveData} from '../../src/types';
import {BABY_CREATURES} from '../../src/data/creatures';
const make=()=>{const s=validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));s.energy=0;s.balls={poke:0,great:0,ultra:0,master:0};s.daily.energyEarned=0;s.daily.participated=[];s.daily.goalDone=false;return s;};
function finish(s:SaveData){advanceAdventure(s,{type:s.storyAdventure?.phase==='completed'?'restart':s.storyAdventure?.phase==='paused'?'resume':'start'});if(s.storyAdventure?.phase==='ready')advanceAdventure(s,{type:'start'});for(let i=0;i<30&&s.storyAdventure?.phase!=='completed';i++){const p=s.storyAdventure!;advanceAdventure(s,{type:p.phase==='invitation'?'invitation-ended':p.phase==='reacting'?'reaction-ended':'media-ended',token:p.token});}assert.equal(s.storyAdventure?.phase,'completed');}
test('old save → story → exchange → capture preserves partners and progress across serialization',()=>{
 const s=make(),old=structuredClone(s);finish(s);assert.equal(s.energy,5);assert.equal(s.daily.adventureReward,5);
 assert.deepEqual(s.captures,old.captures);assert.deepEqual(s.storyProgress,old.storyProgress);assert.deepEqual(s.wordStats,old.wordStats);
 const restored=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(exchangeInvite(restored),true);assert.equal(restored.energy,0);assert.equal(restored.balls.poke,1);
 const id=BABY_CREATURES.map(c=>c.id).find(id=>!restored.captures.some(p=>p.id===id))!;
 assert.equal(invitePartner(restored,id),true);assert.equal(invitePartner(restored,id),false);assert.equal(restored.balls.poke,0);assert.deepEqual(restored.captures.slice(0,old.captures.length),old.captures);
 finish(restored);assert.equal(restored.energy,0);assert.equal(restored.daily.adventureReward,5);
});
test('legacy story and adventure share one 5-point daily story credit in either order',()=>{
 for(const oldFirst of [true,false]){const s=make();if(oldFirst)rewardParticipation(s,'story');finish(s);if(!oldFirst)rewardParticipation(s,'story');assert.equal(s.energy,5);assert.equal(s.daily.adventureReward,oldFirst?3:5);}
});
test('daily cap, day credit, and three-kind bonus remain independent',()=>{
 for(const first of [true,false]){const s=make();s.participation={version:1,days:6,lastDate:'',gifts:0};if(first)finish(s);rewardParticipation(s,'listen');rewardParticipation(s,'repeat');if(!first)finish(s);assert.equal(s.energy,10);assert.equal(s.participation.days,7);assert.equal(s.balls.poke,1);assert.equal(s.daily.goalDone,true);finish(s);assert.equal(s.balls.poke,1);}
 const s=make();s.daily.energyEarned=14;finish(s);assert.equal(s.energy,1);assert.equal(s.daily.energyEarned,15);
});
test('interrupted story resumes, stale completions do not pay, next day requires replay',()=>{
 const s=make();advanceAdventure(s,{type:'start'});advanceAdventure(s,{type:'media-ended',token:s.storyAdventure!.token});const oldToken=s.storyAdventure!.token;advanceAdventure(s,{type:'pause'});advanceAdventure(s,{type:'media-ended',token:oldToken});assert.equal(s.energy,0);
 s.storyAdventure=restoreStory(PICNIC_ADVENTURE,validateSave(JSON.parse(JSON.stringify(s))).storyAdventure);assert.equal(s.storyAdventure.index,1);finish(s);assert.equal(s.energy,5);
 s.daily={...s.daily,date:'2099-01-02',adventureReward:undefined,energyEarned:0,participated:[],goalDone:false};advanceAdventure(s,{type:'media-ended',token:s.storyAdventure!.token});assert.equal(s.energy,5);finish(s);assert.equal(s.energy,10);
});
test('malformed new checkpoints rejected without making new fields required in old saves',()=>{
 const s=make();assert.doesNotThrow(()=>validateSave(s));finish(s);s.storyAdventure!.completed=[];assert.throws(()=>validateSave(s));
});
