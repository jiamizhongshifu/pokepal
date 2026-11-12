import test from 'node:test';
import assert from 'node:assert/strict';
import {beginStory,storyPlayback,restoreStory} from '../../src/lib/storyPlayer';
import {APPLE_PICNIC as a} from '../../src/data/adventures/applePicnic';
test('watching alone completes all beats without participation or inventory effects',()=>{
 let s=storyPlayback(a,beginStory(a),{type:'start'});
 for(let i=0;i<20&&s.phase!=='completed';i++)s=storyPlayback(a,s,{type:s.phase==='invitation'?'invitation-ended':s.phase==='reacting'?'reaction-ended':'media-ended',token:s.token});
 assert.equal(s.phase,'completed');assert.equal(s.completed.length,8);assert.deepEqual(s.participated,[]);
});
test('pause and stale callbacks cannot advance; competing invitation events resolve once',()=>{
 let s=storyPlayback(a,beginStory(a),{type:'start'});
 const old=s.token;s=storyPlayback(a,s,{type:'pause'});
 assert.equal(storyPlayback(a,s,{type:'media-ended',token:old}),s);
 s=storyPlayback(a,s,{type:'resume'});
 while(s.phase!=='invitation')s=storyPlayback(a,s,{type:'media-ended',token:s.token});
 const token=s.token;s=storyPlayback(a,s,{type:'participate',token});
 assert.equal(storyPlayback(a,s,{type:'invitation-ended',token}),s);
 assert.deepEqual(s.participated,['help']);assert.equal(s.phase,'reacting');s=storyPlayback(a,s,{type:'reaction-ended',token:s.token});assert.equal(s.index,3);
});
test('restoration rejects skipped beats, version mismatch and malformed checkpoints',()=>{
 const s=beginStory(a);
 for(const raw of [null,{...s,index:5},{...s,version:99},{...s,index:-1}])assert.deepEqual(restoreStory(a,raw),s);
 const played=storyPlayback(a,storyPlayback(a,s,{type:'start'}),{type:'media-ended',token:1});
 const restored=restoreStory(a,played);assert.equal(restored.index,1);assert.equal(restored.phase,'paused');assert.deepEqual(restored.completed,['welcome']);
});

test('completed checkpoints stay completed and replay starts a fresh run',()=>{
 let s=storyPlayback(a,beginStory(a),{type:'start'});
 while(s.phase!=='completed')s=storyPlayback(a,s,{type:s.phase==='invitation'?'invitation-ended':s.phase==='reacting'?'reaction-ended':'media-ended',token:s.token});
 assert.equal(restoreStory(a,s).phase,'completed');
 assert.deepEqual(storyPlayback(a,s,{type:'restart'}).completed,[]);
});

test('restoring an unopened story remains ready, including repeated mounts',()=>{
 const fresh=beginStory(a);
 assert.equal(restoreStory(a,restoreStory(a,fresh)).phase,'ready');
});
